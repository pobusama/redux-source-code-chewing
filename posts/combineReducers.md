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
 * reducer 函数后面会被合并成一个。建议在 reducers/index.js 里使用 combineReducers() 来对
 * 外输出一个 reducer。
 *
 * @returns {Function} 一个调用 reducers 对象里所有 reducer 的 reducer，并且构造一个
 * 与 reducers 对象结构相同的 state 对象。
 */
export default function combineReducers(reducers) {
    //...
}
```