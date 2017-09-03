import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */

/**
 * 用法：
 * applyMiddleware(middlewareA, middlewareB, middlewareC)(createStore)(reducer, preloadedState, enhancer)
 * 1. applyMiddleware(middlewareA, middlewareB, middlewareC) 返回一个方法用来增强 createStore
 * 2. 该方法接收原 createStore，返回增强后的 createStore。
 * 3. 增强后的 createStore 形参不变，依然是 reducer、preloadedState、enhancer。
 * 4. 增强后的 createStore 还是返回一个标准的 store 对象（包括 getState、subscribe、增强后的 dispatch 等方法）
 * 另外：
 * middleware 函数一般定义如下
 * const middleware = store => next => action => {
 *  // doSomething...
 * }
 */
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

