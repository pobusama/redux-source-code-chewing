/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
/**
 * 用法：compose(f, g, h)  相当于 (...args) => f(g(h(...args)))
 */
export default function compose(...funcs) {
  //compose 0 个函数时返回一个【直接返回参数的函数】：
  if (funcs.length === 0) {
    return arg => arg
  } 
  // compose()(123)
  // 等效于 (x => x)(123)
  // 返回 123

  // compose 1 个函数时【直接返回该函数】：
  if (funcs.length === 1) {
    return funcs[0]
  }
  // compose(x => x + 1)(123);
  // 等效于 (x => x + 1)(123);
  // 返回 124

  // compose 多个函数时返回一个【洋葱】：
  // 例如：compose(a, b, c, d) 时
  const last = funcs[funcs.length - 1] // 取倒数第 1 个被 compose 的函数
  const rest = funcs.slice(0, -1) // 取 0 至倒数第 2 个被 compose 的函数（数组）
  return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
  /**
   * compose(a, b, c, d) 时，last 为 d，rest 为 [a, b, c]。
   * 
   * 至于 Array.prototype.reduce ，第一个参数为计算函数，第二个参数为初始值，如：
   * ['1', '2', '3'].reduce((accumulator, currentValue) => accumulator + currentValue, '0');
   * currentValue 的获取顺序从左到右
   * 所以返回的是 ((('0' + '1') + '2') + '3') 即："0123"
   * reduceRight 和 reduce 的区别就是 currentValue 的获取顺序从右到左
   * 所以返回的是 ((('0' + '3') + '2') + '1') 即："0321"
   * 
   * 回到 compose 
   * rest.reduceRight((composed, f) => f(composed), last(...args))
   * 等效于 [a, b, c].reduceRight((composed, fn) => fn(composed), d(...args))
   * 计算函数是 (composed, fn) => fn(composed)
   * 第一次 composed 参数为 d(...args)，fn 参数为 c，所以返回的是 c(d(...args))
   * 第二次 composed c(d(...args))，fn 参数为 b，所以返回的是 b(c(d(...args)))
   * 第三次 composed b(c(d(...args)))，fn 参数为 a，所以返回的是 a(b(c(d(...args))))
   * 
   * 所以 (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
   * 等效于 (...args) => a(b(c(d(...args))))
   * 
   * 所以 compose(a, b, c, d)
   * 等效于 (...args) => a(b(c(d(...args))))
   * 
   * compose(a, b, c, d)(dispatch)
   * 等效于 a(b(c(d(dispatch))))
   */
}
