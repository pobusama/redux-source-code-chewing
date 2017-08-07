# 繁华的起点 —— createStore

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第一篇文章，我们就从 Redux 库的核心文件 —— createStore.js 开始研读。讲道理，Redux 库跟外面其他妖艳的 JS 库不一样，[配套注释十分详细](https://github.com/pobusama/redux-source-code-chewing/blob/master/source-code/createStore.js)，阅读下来就跟读思路清晰的文章感受差不多。嗯，是个正经的 JS 库。

进入正题，store 是 Redux 的核心概念，那么它的创造者 —— createStore 函数就应该是核心 API 之一了，你可以[预览](https://github.com/pobusama/redux-source-code-chewing/blob/master/source-code/createStore.js)一下它的源码。不出所料，createStore.js 输出的函数只有一个 —— `createStore`。而拉到源码文件的最底部，我们发现这个函数最终返回一个对象，对象上面包含 5 个 API：dispatch、subscribe、getState、replaceReducer 和 [$$observable]，我们主要分析前三个。这个对象也就是我们所谓的 `store`。

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
### createStore 参数

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
  //主体部分...
}
```
我们得出的结论是：
1. `reducer` 是必传参数，类型必须为 `function`。
2. `preloadedState` 和 `enhancer` 是可选参数。
3. `enhancer` 可选参数的类型必须为 `function`。

### createStore 内部变量

接下来是主体部分，这部分比较多，咱们一步步来，我们先看 createStore 函数内部维护了哪些变量。
```js
export default function createStore(reducer, preloadedState, enhancer) {
    //...参数校验部分
    /* -------------- createStore 正片部分 -------------- */
    var currentReducer = reducer
    var currentState = preloadedState
    var currentListeners = []
    var nextListeners = currentListeners
    var isDispatching = false
    //...
}
```
1. currentReducer：当前 store 应用的 reducer，默认使用传入的 reducer 参数，可通过 replaceReducer 函数来热替换 currentReducer。
2. currentState：默认为传入的 preloadedState 参数，可通过 dispatch 函数改变。
3. currentListeners：当前订阅队列，用以存放通过 subscribe 函数执行的订阅。
4. nextListeners：subscribe 函数可以订阅或取消订阅，`nextListeners` 用来存放订阅或取消订阅后的队列。
5. isDispatching：dispatch 函数的标志位，作用后面会讲到。
我们大致了解了这些变量的基本用处。接下来你一定以为我会顺着源码聊到 `getState()`，哈哈那怎么是我的风格！

### 触发 state 的变化 —— dispatch

现在我们再次纵观整个 `createStore.js` 文件，发现定义 5 个变量之后紧接着定义了几个 API 函数，而**真正执行内部函数的地方，只有靠近文件最底部的 `dispatch({ type: ActionTypes.INIT })` 这段代码**，我先告诉你这是初始化整个 `state` 的关键步骤。至于它是怎么初始化 `state` 的，且看 `dispatch` 做了些什么：
```js
//...
function dispatch(action) {
    /* -------------- dispatch 参数校验部分 -------------- */
    // action 要求是一个简单对象（plain object）
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }
    // 最基础的 dispatch 函数（没有接入三方中间件）接收的 action 对象必须要带 type 参数。
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }
    /**
    * 标识位，用来锁定 reducer 计算过程，
    * 如果 reducer 计算过程中调用了 dispatch 函数则会报错（为什么不能调用用？请接着往下看）。
    */
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }
    /* -------------- dispatch 正片部分 -------------- */
    try {
      /**
       * 这是 Redux 的灵魂部分
       * 作用是将当前 state 和 action 交给 reducer 函数处理，计算出**新的 state**
       * 注意！在 reducer 函数中要避免调用 dispatch 
       * 原因类似银行取钱：假设你和女朋友共存了 100 元，在某时刻，你取 10 块钱
       * 此时银行系统便会对你的账户计算：`100 - 10 = 90`
       * 如果计算过程中你女朋友取 20 元，那么银行系统又会计算：`100 - 20 = 80`
       * 那结果到底是 90 还是 80 呢？
       * 当然是 70 ！
       * 银行家的做法是在你 “取钱 -> 结算完毕” 过程中冻结其他存取操作（在本源码中是置 isDispatching 标识位为 true），
       * 你女朋友只能在你 “取钱 -> 结算完毕” 过程以外的时间里取钱。
       */ 
      isDispatching = true // 更改过程锁
      currentState = currentReducer(currentState, action) // 将当前 state 和 action 交给 reducer 计算
    } finally {
      // 无论计算成功还是报错，最终都将标志位置为 false，以免阻碍下一个 action 的 dipatch。
      isDispatching = false
    }
    /**
    * 此时 state 已经更新完毕，我们将订阅队列中的函数一一执行
    * 我们在这些函数里可以拿到更新后的 state。
    */
    var listeners = currentListeners = nextListeners
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]()
    }
    // 此处设伏笔，在 applyMiddleware 里有妙用。
    return action
  }
//...
```

现在回头再看看 `dispatch({ type: ActionTypes.INIT })` 这段代码，你一定已经对他了若指掌了。
拿 `demo1` 中设计的 reducer 函数举例子：
```js
// reducer
const todos = (state = [], action) => {
    switch (action.type) {
        case ADD:
            return [...state, {...action.payload}];
        default:
            return state;
    }
}
```
作为使用者我们肯定不会针对 `ActionTypes.INIT` 这个 Redux 内部的 action type 做相应计算，那么 reducer 函数就会直接走 default case 从而返回 currentState。毫无疑问，在 store 初始化的时候，这个 state 要么是 reducer 函数定义的缺省 state（这里是 `[]`），要么是 createStore 函数中传入的第二个参数 `preloadedState`。这样我们就完成了 state 的初始化。

在初始化之后，在其他地方触发 `dispatch` 函数，就是我们熟悉的过程了：通过 action 携带的信息和 currentState 计算 nextState，更新 store 内部的 currentState。

所以我们通过 createStore 函数拿到 store 对象意味着什么呢？结论是：
1. 我们在 store 内部已经有了一个 state（currentState）。
2. 我们有 5 个 API 来管理这个 state。

### 获取当前 state —— getState

如何获取当前 state？想必你已经能预测到它的源码是怎么写的了：
```js
//...
function getState() {
    return currentState
}
//...
```

### 订阅（监听）state 的变化 —— subscribe
我们目前有了初始 state，有了更新 state 的方式，还有获取当前 state 的方式。但我们如何监听 state 的变化呢？细心的你肯定已在 dispatch 函数的实现代码中初见端倪了。
好我们来看 subscribe 函数：

```js
function subscribe(listener) {
    /* -------------- subscribe 参数校验部分 -------------- */
    // listener 必须是函数类型（state 变更以后调用）
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    /* -------------- subscribe 正片部分 -------------- */
    // 每次订阅都会维护一个标志位，以便在重复取消订阅的时候提高性能
    var isSubscribed = true 

    ensureCanMutateNextListeners()
    nextListeners.push(listener)// 向 listeners 队列中添加订阅函数

    /**
     * 取消订阅
     */
    return function unsubscribe() {
      // 防止重复取消订阅时，再次进行下面比较耗费性能的运算
      if (!isSubscribed) {
        return
      }
      // 取消订阅先把标志位置 false
      isSubscribed = false

      ensureCanMutateNextListeners()
      // 找到订阅函数在订阅队列中的位置
      var index = nextListeners.indexOf(listener)
      // 删除订阅队列中的相应订阅函数。
      nextListeners.splice(index, 1)
    }
```
粗略看下来逻辑还是比较清晰的，该 API 提供了订阅和取消订阅的功能，订阅时，向内部维护的订阅队列（nextListeners）中 push 订阅函数。这时候我们回顾一下 dispatch ，state 变更后将 nextListeners 数组中的订阅函数按顺序执行，这就完成了订阅 -> 执行订阅函数的循环。
```js
var listeners = currentListeners = nextListeners
for (var i = 0; i < listeners.length; i++) {
    listeners[i]()
}
```
此外，subscribe 返回一个 unsubscribe 函数用于取消订阅。 unsubscribe 利用 subscribe 函数闭包变量 listener，定位到订阅队列的相应位置，然后删除相应订阅函数。

我在 [`demo2`]() 中简单地演示了一下取消订阅的用法，请运行 `npm run demo2` 查看结果。
```js
// demo2
// ... 以上是相同的代码
// 这回添加了两个监听函数
const subscribeA = store.subscribe(() => {
    console.log('subscribeA do this:')
    printState(store);
});
const subscribeB = store.subscribe(() => {
    console.log('subscribeB do this:')
    printState(store);
});
// 执行 dispatch 后，监听函数依次执行
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn Redux',
        completed: false
    }
});
/**
* 这一步打印：
* subscribeA do this:
* current state: [{"text":"learn Redux","completed":false}]
* subscribeB do this:
* current state: [{"text":"learn Redux","completed":false}]
*/
// 取消 subscribeB 订阅函数
subscribeB();
// 现在执行 dispatch 后，只有 subscribeA 订阅函数会执行。
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn React',
        completed: false
    }
});
/**
* 这一步打印：
* subscribeA do this:
* current state: [{"text":"learn Redux","completed":false},{"text":"learn React",
* "completed":false}]
*/
```

慢着！我们好像漏看了两行代码！subscribe 函数中出现了两次 `ensureCanMutateNextListeners()`，它们是干什么用的呢？

从字面理解，这行代码用于 “确认可以修改 nextListeners 变量”。还是不懂？没关系！


