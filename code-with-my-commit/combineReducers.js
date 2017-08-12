import { ActionTypes } from './createStore'
import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'

/**
 * 用来提示使用者，哪个 action 经过哪个 Reducer 函数处理时没有返回正常的 state
 * 根据 redux 的规则，Reducer 函数处理每个 action 的后都必须返回一个 state 
 * 而不是 undefined。
 */
function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type
  var actionName = actionType && `"${actionType.toString()}"` || 'an action'

  return (
    `Given action ${actionName}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state.`
  )
}

/**
 * 
 *  
 */
function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers)
  var argumentName = action && action.type === ActionTypes.INIT ?
    'preloadedState argument passed to createStore' :
    'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  var unexpectedKeys = Object.keys(inputState).filter(key =>
    !reducers.hasOwnProperty(key) &&
    !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

function assertReducerSanity(reducers) {
  // 遍历 reducers 对象上的 reducer 属性以及相应的 reducer 函数
  Object.keys(reducers).forEach(key => {
    var reducer = reducers[key]
    /**
     * 一般 reducer 的函数签名为：reducerA (state = initialState, action)
     * 1. 给 reducer 的 state 形参传入 undefined，
     * 这样 reducer 函数就会使用缺省值 initialState，
     * 2. 给 reducer 的 action 形参传入 `{ type: ActionTypes.INIT }`,
     * 由于一般使用者定义的 reducer 不会为 `ActionTypes.INIT` 这个 case 做特殊处理，
     * 所以 reducer 就会走 default case。也就是 return 当前 state，即 initialState。
     */
    var initialState = reducer(undefined, { type: ActionTypes.INIT })

    /**
     * 检验当前遍历的 reducer 在定义时有没有为 state 参数设置缺省值。
     */
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
        `If the state passed to the reducer is undefined, you must ` +
        `explicitly return the initial state. The initial state may ` +
        `not be undefined.`
      )
    }

    /**
     * 使用探针检查验当前遍历的 reducer 有没有 default case。
     * 做法是将一个拥有随机 actionType 的 action 对象传入 reducer，
     * 然后判断 reducer 处理 action 后 return 的 state 是否为 undefined。
     */
    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')
    if (typeof reducer(undefined, { type }) === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
        `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
        `namespace. They are considered private. Instead, you must return the ` +
        `current state for any unknown actions, unless it is undefined, ` +
        `in which case you must return the initial state, regardless of the ` +
        `action type. The initial state may not be undefined.`
      )
    }
  })
}

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
  var reducerKeys = Object.keys(reducers)
  var finalReducers = {}
  /**
   * 遍历 reducers 对象上的属性，
   * 1. 做非空校验
   * 2. 保留属性为 function 类型的 reducer
   */
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      // 非空校验
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }
    // 筛选为函数的 reducer
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  // 这里 finalReducers 是筛选完毕后的 reducers 对象
  var finalReducerKeys = Object.keys(finalReducers)

  // ？开发环境下对未知 reducer 作缓存
  if (process.env.NODE_ENV !== 'production') {
    var unexpectedKeyCache = {}
  }

  var sanityError
  try {
    /**
     * 完善性检测
     * 检验 finalReducers 对象上的每一个子 reducer 能否按照 redux 定义的规则处理 action。
     * 并 return 正确的 state。
     */
    assertReducerSanity(finalReducers)
  } catch (e) {
    sanityError = e
  }

  // 组合 finalReducers 对象上的子 reducer 逻辑，
  // 返回最终的 rootReducer。
  return function combination(state = {}, action) {
    //如果未通过完善性检测，则中断并抛出异常。
    if (sanityError) {
      throw sanityError
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    // 用以判断 state 是否被改变的标识位
    var hasChanged = false
    var nextState = {}
    //再一次遍历 finalReducerKeys 对象上的子 reducer。
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i]
      var reducer = finalReducers[key]
      /**
       * 用当前子 reducer 名字在 state 上获取或建立与 reducer 对应的 state 分支。
       * 如果是初始化阶段，则是建立 state 分支，这个 state 分支的值是 undefined。
       * 如果非初始化阶段，则是获取 state 分支的值。
       */
      var previousStateForKey = state[key]
      // 用当前子 reducer 计算 action，返回与子 reducer 对应的 state 分支的值。
      var nextStateForKey = reducer(previousStateForKey, action)
      // 同样要检测一下子 reducer 有没有正确返回 state。
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 将子 reducer 计算后的局部 state 挂在对应的 state 分支上
      nextState[key] = nextStateForKey
      /**
       * 这里并不是直接用 state 与 nextState 对比，
       * 由于两者都是对象，对象相比比地址。nextState 变量是刚才新定义的，肯定与 state 的地址不同。
       * 这里是对比每个 nextStateForKey 与 previousStateForKey，通过短路写法可以提高效率。
       * 当然也同样存在对象相比比地址的情况。
       * redux 的规则是，如果在 reducer 里面更新 state，不是直接修改 state，
       * 而是开辟新的地址修改并存放 newState，然后最终作为 reducer 的返回值。
       * 也就是说如果某个子 reducer 更新了 state，
       * 根据 redux 的规则，其 nextStateForKey 和 previousStateForKey 不可能相等。
       */
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }
}
