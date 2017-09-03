# combineReducers —— 涓涓溪流，可成江海

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第二篇文章，在第一篇文章[我简单提到了 reducer](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/createStore.md#触发-state-的变化--dispatch)，这也是 Redux 里的一个重要概念。

我们常常会在营销活动广告的角落里找到一行字：“最终解释权归主办方所有”。也就是说你按照活动规则完成任务以后，怎么获得奖励以及获得多少奖励，由 “主办方” 说了算。而在 Redux 中，触发了一个 action，这个 action 通过什么方案改变 state，改变 state 的哪些部分，由 reducer 说了算，它就是所谓的 “主办方“，或者更具体来说是 ”主办方“ 的解释规则。

然而，随着 Redux 应用的复杂度提升（比如模块的增加），与之对应的 state 树变得更加庞大，相应的 reducer 函数也会随之变得越来越冗长。于是 Redux 给我们提供了 combineReducers 函数，让我们按模块拆分 reducer，再将拆分后的 reducer 组合起来。看起来，这是一个由一到多，再由多归一的过程。

我们来一探究竟。

## 用法回顾
```js
// reducers/todos.js
export default function todos(state = [], action) {
  switch (action.type) {
  case 'ADD_TODO':
    return state.concat([action.text])
  default:
    return state
  }
}
// reducers/counter.js
export default function counter(state = 0, action) {
  switch (action.type) {
  case 'INCREMENT':
    return state + 1
  case 'DECREMENT':
    return state - 1
  default:
    return state
  }
}
//reducers/index.js
import { combineReducers } from 'redux'
import todos from './todos'
import counter from './counter'

export default combineReducers({
  todos,
  counter
})
// App.js
import { createStore } from 'redux'
import reducer from './reducers/index'

let store = createStore(reducer)
console.log(store.getState())
// state 初始化后，会与 reducers 对象的 key 相同。
// {
//   counter: 0,
//   todos: []
// }

store.dispatch({
  type: 'ADD_TODO',
  text: 'Use Redux'
})
console.log(store.getState())
// {
//   counter: 0,
//   todos: [ 'Use Redux' ]
// }
```

## 源码分析

### combineReducers 的参数
首先看 combineReducers 的参数文档：
```js
/**
 * 把一个由多个不同 reducer 函数作为 value 的 object，合并成一个最终的 reducer 函数，
 * 然后就可以对这个 reducer 调用 createStore。合并后的 reducer 可以调用各个子 reducer，
 * 并把它们的结果合并成一个 state 对象。state 对象的结构由传入的多个 reducer 的 key 决定。
 *
 * @param {Object} reducers 一个对象，它的值（value） 对应不同的 reducer 函数，这些 
 * reducer 函数后面会被合并成一个。建议在 reducers/index.js 里使用 combineReducers() 来
 * 对外输出一个 reducer。
 *
 * @returns {Function} 一个调用 reducers 对象里所有 reducer 的 reducer，并且构造一个
 * 与 reducers 对象结构相同的 state 对象。
 */
export default function combineReducers(reducers) {
    //...
}
```
了解了基本参数、返回值和使用场景，我们看具体的实现代码。同样，处于严谨，有一段代码用于校验、筛选 reducers 参数。
```js
export default function combineReducers(reducers) {
  // 取 reducers 对象的属性，存到 reducerKeys 数组中
  var reducerKeys = Object.keys(reducers)
  // 定义一个用来存放筛选后 reducers 属性的对象。
  var finalReducers = {}
  /**
   * 遍历 reducers 对象上的属性，
   * 1. 做非空校验
   * 2. 保留属性为 function 类型的 reducer
   */
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i]
    if (process.env.NODE_ENV !== 'production') {
      // 属性空警告
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }
    // 筛选为类型函数的 reducer
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  // 这里 finalReducers 是筛选完毕后的 reducers 对象
  var finalReducerKeys = Object.keys(finalReducers)

  // 开发环境下用于 warning 信息，暂不细究
  if (process.env.NODE_ENV !== 'production') {
    var unexpectedKeyCache = {}
  }

  // 定义该异常变量用于完善性检测
  var sanityError
  try {
    /**
     * 完善性检测
     * 检验 finalReducers 对象上的每一个子 reducer 能否按照 redux 定义的规则处理 action，
     * 并 return 正确的 state。
     * 如果不满足完善性检测，则抛出异常
     */
    assertReducerSanity(finalReducers)
  } catch (e) {
    sanityError = e
  }

  //...
}
```
到这里，如果不出意外的话 `finalReducers` 就是筛选后的 `reducers` 对象。我们接着用 `finalReducers` 
完成 combineReducers 逻辑。

我们得到的结论是：
- `finalReducers` 对象中的 reducer 都为函数类型。
- `finalReducers` 对象中的 reducer 都能正常计算并返回 state。

### combineReducers 的实现
我们继续看源码：
```js
export default function combineReducers(reducers) {
  //参数校验...
  /**
   * 最终返回的 rootReducer 函数组合了 finalReducers 对象上的子 reducer 逻辑。
   */
  return function combination(state = {}, action) {
    // 如果未通过完善性检测，则中断并抛出异常。
    if (sanityError) {
      throw sanityError
    }

    // 开发环境下用于 warning 信息，暂不细究
    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    // 用以判断 state 是否被改变的标识位
    var hasChanged = false
    // 定义该对象用于保存更改后的 state 树
    var nextState = {}
    //再一次遍历 finalReducerKeys 对象上的子 reducer 属性。
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i]
      var reducer = finalReducers[key]
      /**
       * 获取变更前 state 上与 reducer key 相对应的部分 state。
       * 如果是初始化阶段，该 state 分支的值是 undefined。
       * 如果非初始化阶段，则是获取 state 分支的值。
       */
      var previousStateForKey = state[key]
      // 用当前 reducer 计算 action，返回计算后的部分 state。
      var nextStateForKey = reducer(previousStateForKey, action)
      // 检测一下当前 reducer 有没有正确返回 state。
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 将子 reducer 计算后的部分 state 挂在对应的 state 树属性上
      nextState[key] = nextStateForKey
      /**
       * 这里是对比每个 nextStateForKey 与 previousStateForKey，通过短路写法可以提高效率。
       * 对象相比比地址，如果 nextStateForKey 是 reducer 返回的新的 state，
       * 与 previousStateForKey 地址不同 hasChanged 就会变 true。
       * 
       * reducer 的规则是，若要在 reducer 里面更新 state，不是直接修改 state，
       * 而是开辟新的地址修改并存放 newState，然后最终作为 reducer 的返回值。
       * 根据该规则，如果 state “变更” 了，其 nextStateForKey 和 previousStateForKey 地址
       * 不相等。
       */
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    // 如果未改变，则返回旧 state，相应地 UI 方面也不用回流。
    return hasChanged ? nextState : state
  }
}
```

其实 combineReducers 工具函数我们也可以自己实现，只不过 redux 提供给我们的这个工具实现了比较完善的排错机制。我们这里就不详细讨论这些排错机制了，如果你有兴趣和我一起理解，请移步[我的注释的版本](https://github.com/pobusama/redux-source-code-chewing/blob/master/code-with-my-commit/combineReducers.js)～

[暂不允许转载]