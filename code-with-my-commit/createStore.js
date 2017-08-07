import isPlainObject from 'lodash/isPlainObject'
import $$observable from 'symbol-observable'

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
export var ActionTypes = {
  INIT: '@@redux/INIT'
}

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
  /* -------------- createStore 正片部分 -------------- */
  var currentReducer = reducer
  var currentState = preloadedState
  var currentListeners = []
  var nextListeners = currentListeners
  var isDispatching = false

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    /* -------------- subscribe 参数校验部分 -------------- */
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    /* -------------- subscribe 正片部分 -------------- */
    var isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      var index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    /* -------------- dispatch 参数校验部分 -------------- */
    // action 要求是一个简单对象（plain object）
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    // 最基础的 dispatch 函数（没有接入三方中间件）接受的 action 对象必须要带 type 参数
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }

    // 标识位
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    /* -------------- dispatch 正片部分 -------------- */
    try {
      // 处理过程锁
      /**
       * 这是 Redux 的灵魂部分
       * 作用是将当前 state 和 action 交给 reducer 函数处理，计算出**新的 state**
       * 注意！在 Reducer 函数中要避免调用 dispatch 
       * 原因类似银行取钱：假设你和女朋友共存了 100 元，在某时刻，你取 10 块钱
       * 此时银行系统便会对你的账户计算：`100 - 10 = 90`
       * 如果计算过程中你女朋友取 20 元，那么银行系统又会计算：`100 - 20 = 80`
       * 那结果到底是 90 还是 80 呢？
       * 当然是 70 ！
       * 银行家的做法是在你取钱 -> 结算完毕过程中冻结其他存取操作（在本源码中是置 isDispatching 标识位为 true），
       * 你女朋友只能在你取钱 -> 结算过程以外的时间里取钱。
       */ 
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      // 无论计算成功还是报错，最终都将标志位置为 false，以免阻碍下一个 action 的 dipatch。
      isDispatching = false
    }

    // 此时 state 已经更新完毕，我们执行订阅的回调函数里拿到的是更新后的 state。
    var listeners = currentListeners = nextListeners
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]()
    }

    // 此处设伏笔，在 applyMiddleware 里有妙用
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    /**
     * 1. 替换当前 Reducer
     * 2. 初始化 state
     */
    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/zenparsing/es-observable
   */
  function observable() {
    var outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        var unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  /**
   * 触发一个内部 action
   * 用 raducer 的 initial state 初始化 state 整个树
   */
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
