# 繁华的起点 —— createStore
这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第一篇文章，我们就从 Redux 库的核心文件 —— createStore.js 开始研读。讲道理，Redux 库跟外面其他妖艳的 JS 库不一样，[配套注释十分详细](https://github.com/pobusama/redux-source-code-chewing/blob/master/source-code/createStore.js)，阅读下来就跟读思路清晰的文章感受差不多。嗯，是个正经的 JS 库。

进入正题，store 是 Redux 的核心概念，那么它的创造者 —— createStore 函数就应该是核心 API 之一了，你可以[预览](https://github.com/pobusama/redux-source-code-chewing/blob/master/source-code/createStore.js)一下它的源码。不出所料，createStore.js 输出的函数只有一个 —— `createStore`。而拉到源码文件的最底部，我们发现这个函数最终返回一个对象，对象上面包含 5 个 API：dispatch、subscribe、getState、replaceReducer 和 [$$observable]，我们主要分析前三个。这个对象也就是我们俗称的 `store`。

那么接下来，我们先回顾一下 `createStore` 的用法。

**提示：**本文基于 Redux 的 3.6.0 版本

## 用法回顾

如果用一句话总结 Redux 的基本用法，那便是**创建 store，监听 state 变化，触发 action 使 state 变更**。写一段你不能再熟悉的代码：
```js
// demo1
import {createStore} from 'redux';
// actionTypes
const ADD = 'add';
// reducer
const todos = (state = [], action) => {
    switch (action.type) {
        case ADD:
            return [...state, {...action.payload}];
        default:
            return state;
    }
}
// store
const store = createStore(todos);
const printState = store => 
    console.log(`current state:`, JSON.stringify(store.getState()));
printState(store);
// subscribe
store.subscribe(() => {
    printState(store);
});
// dispatch
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn Redux',
        completed: false
    }
});
```
运行一下这段代码（`npm run demo1`），控制台输出：
```
current state: []
current state: [{"text":"learn Redux","completed":false}]
```
由第一行可知，`store` 创建成功，state 初始化完成。第二行则是说明我们成功使用 `dispatch` API 改变了 state。
回顾完毕，接下来来看看 Redux 是怎么实现这几个 API 的。

## 源码分析
读懂文档是读懂源码的第一步，我们先看下 `createStore` 的 API 文档（酱油翻译，轻喷⇁_⇁）说了些啥：

```js
/**
 * 创建一个用于管理 state 树的 Redux store 对象。
 * 修改 store 中数据的唯一方式就是调用 store 对象上的 `dispatch()` 方法。
 * 
 * 一个应用只能拥有单一 store。
 * state 树的不同部分会根据 action 作出响应，为了区分这些不同，你可以使用 `combineReducers` 
 * 函数将多个 reducer 函数拼装到一个单一的 reducer 函数上。
 *
 * @param {Function} reducer 一个 return 下一个 state 树的函数，
 * 这个函数接收当前 state 和 action，用来处理当前 state 并产生下一个 state。
 *
 * @param {any} [preloadedState] 初始 state。可选参数，在一般的应用中，该参数可以用于
 * 整合来自服务端的状态，也可以用来保存前一次的用户会话记录（session）。
 * 如果你使用 `combineReducers` 来生产 root reducer 函数，该参数必须是一个和 
 * `combineReducers` 的属性的形式一样的对象。
 *
 * @param {Function} enhancer store 的增强器。可选参数，该参数用于增强 store，我们可以通过
 * 第三方例如中间件、时间旅行、持久化等功能来增强 store。`applyMiddleware()` 是唯一由 Redux 
 * 提供的增强器。
 *
 * @returns {Store} 一个 Redux store 对象，通过该对象你可以读取 state，触发 action，
 * 并订阅（监听）state 的更新。
 */
export default function createStore(reducer, preloadedState, enhancer) {
    //...
}
```
好了，现在我们对 createStore 函数的基本用法、参数作用和返回值有了大致的认识，接下来，我们看看 createStore 函数的内部逻辑。

首先我们从参数校验部分巩固对参数的理解：
```js
export default function createStore(reducer, preloadedState, enhancer) {
  /* -------------- createStore 参数校验部分 -------------- */
  /**
   * 参数校验，如果第二个形参传入的是函数，且第三个形参不传，则第二个实参代表 enhancer。
   * 换句话说，preloadedState 是可选配置。
   */
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }
  // 校验传入的 enhancer 实参是否是函数。
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    /**
     * 从这里可以看出，enhancer 的一般形式是：
     * const enhancer = (createStore) => {
     *  //返回一个函数 `finalCreateStore`，用于接收 reducer 和 preloadedState
     *  return function finalCreateStore (reducer, preloadedState) {
     *    //这里可以拿到原 createStore、reducer 和 preloadedState
     *    //然后添加自定义逻辑
     *    //最终返回 store 对象
     *    return createStore(reducer, preloadedState);
     *  } 
     * }
     */
    return enhancer(createStore)(reducer, preloadedState)
  }
  // 校验传入的 reducer 实参是否是函数。
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
  //...
}
```