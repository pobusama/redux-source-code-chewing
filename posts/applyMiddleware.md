# applyMiddleware —— Redux 的拓展坞

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第五篇文章，我们聊聊 applyMiddleware。在此假设你已经对 Redux 中间件有一定认识，建议先阅读[官方文档](http://cn.redux.js.org/docs/advanced/Middleware.html)。

## 为什么有 applyMiddleware ？
在[对 createStore 的 API —— dispatch 进行分析](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/createStore.md#触发-state-的变化--dispatch)时，我们知道 dispatch 只接收限定类型的 action 对象：
1. 必须是纯对象（plain object）。
2. 必须拥有 type 属性。
因为 dispatch 规定的 action 对象是用于 reducer 计算这一 “特殊用途”。

我们先讨论一个问题：

在纵览 Redux 的实现机制后，我们发现，从 action 到 reducer 再到 state 变更，整个流程都是同步的。显然在实际应用中，会有一些异步操作。那么这些异步操作应该放在哪里才合适呢？

我们知道，更新 Redux store 数据的关键之一是 action 对象。action 的 type 和携带的其他数据都决定 reducer 中的计算结果。我们仔细思考一下分发 action 对象的过程，如果分发一个 action 的时候，不是直接调用 reducer 计算，而是先去进行异步操作，异步操作拿到结果以后再调用 reducer 计算，是不是在 Redux 体系中完成异步需求的一种方式呢？

如果要实现上面的假设，我们需要做到两件事情。
1. dispatch API 需要 “定制化”，不再拿着 action 去执行 reducer 等原有操作。
2. 为了区分定制化的 dispatch 和普通的 dispatch，action 也需要定制化。即一种 action 对应着一种 dispatch。

applyMiddleware 的主要能力就是为这两点提供支持。做到了这两点，意味着你可以自由定制 action - dispatch 的组合（这个则是中间件的功能），异步需求只是可完成的任务之一（其他的功能任由你拓展，比如打印 action 日志）。

## 如何使用 applyMiddleware？
既然有 “applyMiddleware” 那就有 “middleware”，Redux 中，中间件的接口定义十分明确，一个典型的中间件格式如下：
```js
const aMiddware = {getState, dispatch} => next => action => {
    // 检查 action，看下是不是符合本中间件的要求
    if ( isRightAction(action) ) {
        // 拿到 getState、dispatch、action，做本中间件的特定逻辑
    } else {
        // 如果不是本中间件需要的 action 对象，将 action 交给下一个中间件处理
        return next(action)
    }
}
```
而启用自定义的中间件，只需要在 createStore 的时候做一些变化。
```js
const store = createStore(reducer, initState, applyMiddleware(
    middlewareA,
    middlewareB,
    middlewareC,
    // more ...
)); 
```
在[讲 createStore 的参数时](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/createStore.md#createstore-的参数)，我们知道了 createStore 的第三个参数是 Enhancer 函数，它接收原始 store 返回加强后的 store，applyMiddleware **返回的函数**就是典型的 Redux Enhancer 函数 —— 它接收 store 对象，返回加强后的 store 对象。

梳理一下：
1. applyMiddleware 接收中间件函数（可以多个）作为参数。
2. applyMiddleware 返回 Redux Enhancer 函数。
2. Redux Enhancer 函数接收 store 对象、返回 store 对象。

## applyMiddleware 源码分析

```js
export default function applyMiddleware(...middlewares) {
  //返回 Redux Enhancer 函数（接收 store 对象、返回 store 对象）
  return (createStore) => (reducer, preloadedState, enhancer) => {
    // 获得原始 createStore 生成的 store
    var store = createStore(reducer, preloadedState, enhancer)
    // 获得原始 dispatch
    var dispatch = store.dispatch
    var chain = []
    // 给中间件传入可用的 store API
    var middlewareAPI = {
      getState: store.getState,
      /**
      * (action) => dispatch(action) 等价于 (action) => {return dispatch(action)}
      * 函数内部的 dispatch 指向外层定义的 dispatch
      * 当 middleware 内部执行 middlewareAPI.dispatch 方法时
      * dispatch 已经是 compose 之后的 dispatch
      */
      dispatch: (action) => dispatch(action) 
    }
    // 为 middleware 分配统一的 middlewareAPI 后，将 middleware 返回的函数（这里称作 handler）收集在 chain 数组中
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // dispatch = handlerA(handlerB(handlerC(store.dispatch)))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch //middleware handler 处理后的 dispatch
    }
  }
}
```
回过头来看中间件的定义，我们可以对可用的 API 更加明确：
```js
const aMiddware = {getState, dispatch} => next => action => {
    // 检查 action，看下是不是符合本中间件的要求
    if ( isRightAction(action) ) {
        // 1. getState：来自原始 store 对象的 API
        // 2. dispatch：compose 以后的 dispatch，意味着在这里分发 action 对象，action 会完整地经过所有中间件。
        // 3. action：上一个中间件未捕获的 action 对象。

    } else {
        // 如果不是本中间件需要的 action 对象，将 action 交给下一个中间件（准确来说是中间件的返回函数 handler）处理
        return next(action)
    }
}
```

## compose 在这中间起的作用
在源码中有一行把 middleware 函数的最外面一层执行了，产生我们称之为 "handler" 的函数，再对这些函数进行 compose。
```js
chain = middlewares.map(middleware => middleware(middlewareAPI))
dispatch = compose(...chain)(store.dispatch)
```
handler 的形状如下: 
```js
next => action => {
    //...
    return next(action);
}
```
源码中把每个 middleware 生成的 handler 通过 compose 组装起来，原始的 dispatch 函数通过 handler 组成的 “管道”，成为新的函数。这里依然运用了函数式编程中 “函数是一等公民” 的原则，把 dispatch 函数作为 “管道” 的数据源，对其做自定义的改造。
**注意：** 由于 middware 是由开发者决定的，所以开发者可以决定是否 `return next(action);`，这句话是管道衔接的关键，如果移除这句话，就是要断开 “管道”，即到当前 handler 为止，不再交给下一层 handler 处理了，所以需要谨慎。

最终分发 action 的时候， action 会被重新定义的 dispatch 函数处理，而这个函数根据 action 的特征决定将其交给哪一层的 handler 处理。

梳理：
1. compose 实际组合了中间件的逻辑。
2. 由于管道的特性，我们要谨慎处理每个管道区间的返回值。

## 总结
applyMiddleware 区区十几行代码，为 redux 提供了对外接口，我们可以自由设计 action - dispatch 的搭配，让 action 不再受限于 reducer 的范围。

然而，这种 “自由” 依然是有限的，applyMiddleware 把这份自由限制在了分发 action 的过程中。不过，这正是 Redux 的智慧，毕竟过度的自由带来的是维护的灾难。

但我们还是有权利获取更多的自由的，第一章里提到的 Enhancer 就是这个 “黑洞” 的入口。毕竟，applyMiddleware 也只是无数 Redux Enhancer 的一种。不过，这不在我们本次源码研究的讨论范围内。

[禁止转载]