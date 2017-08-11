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
  /**
   * 定义的几个变量：
   * 1. currentReducer：当前 store 应用的 reducer，默认使用传入的 reducer 参数，可通过
   * replaceReducer 函数来热替换 currentReducer。
   * 2. currentState：默认为传入的 preloadedState 参数，可通过 dispatch 函数改变。
   * 3. currentListeners：当前订阅队列，用以存放通过 subscribe 函数执行的订阅。
   * 4. isDispatching：dispatch 函数的标志位，作用后面会讲到。
   */
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
   * 添加一个订阅 state 变更的监听函数（listener）。该监听函数将会在 action 分发后，
   * state 树完成可能的变更之后被调用。接着你可以在这个回调中通过调用 `getState()` 
   * 来读取当前 state。
   *
   * 你可能会在一个监听函数中调用 `dispatch()`，请知晓以下注意事项：
   * 
   * 1. 监听函数只应当在响应用户的 actions 或者特殊的条件限制下（比如：在 store 有一个
   * 特殊字段时 dispatch action）才能调用 dispatch()。虽然不作任何条件限制而在监听函数中
   * 调用 dispatch() 在技术上是可行的，但是随着每次 dispatch() 改变 store 可能会导致陷
   * 入无穷的循环。
   * 
   * 2. 在每次调用 `dispatch()` 之前，订阅队列（subscriptions）会保存一份快照。如果你在
   * 订阅函数正在执行的时候订阅或者取消订阅，那这次订阅或取消订阅并不会影响本次 `dispatch()` 
   * 过程。但下次调用 `dispatch()` 时，无论其是否嵌套，它都会应用订阅列表里最近的一次快照。
   *
   * 3. 因为在监听函数执行前，state 有可能在一个嵌套的 `dispatch()` 中改变多次，所以监听
   * 函数不一定能跟踪到所有的 state 变更。保证所有的监听器都注册在 dispatch() 启动之前，
   * 这样，在调用监听器的时候就会传入监听器所存在时间里最新的一次 state。
   *
   * @param {Function} listener 每当 dispatch action 的时候都会执行的回调函数。
   * @returns {Function} 一个用来移除函数变化监听器的函数。
   */
  function subscribe(listener) {
    /* -------------- subscribe 参数校验部分 -------------- */
    // listener 必须是函数类型（state 变更以后调用）
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    /* -------------- subscribe 正片部分 -------------- */
    // 每次订阅都会维护一个标志位，以便在重复取消订阅的时候提高性能
    var isSubscribed = true 

    /**
     * 为了方便阅读，这里把源码中的 `ensureCanMutateNextListeners()` 替换成其实际代码
     */
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
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
    dispatch({
      type: ActionTypes.INIT
    })
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
        return {
          unsubscribe
        }
      },

      [$$observable]() {
        return this
      }
    }
  }

  /**
   * 触发一个内部 action，这样每个 reducer 都返回其 intial state，
   * 我们用各个子 raducer 的 initial state 初始化 state 整个树。
   */
  dispatch({
    type: ActionTypes.INIT
  })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}