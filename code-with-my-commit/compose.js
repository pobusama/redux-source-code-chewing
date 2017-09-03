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
 * 用法：`compose(f, g, h)`  相当于 `(...args) => f(g(h(...args)))`
 */
export default function compose(...funcs) {
  /**
   * 当 compose 不接收函数实参时，返回一个**返回第一个实参的函数**。
   * 例如：`compose()(123, 456)` 等效于 `(x => x)(123, 456)`
   * 返回 123
   * 注：参考 demo7
   */
  if (funcs.length === 0) {
    return arg => arg
  } 
  /**
   * 当 compose 接收 1 个函数实参时返回【该函数】。
   * 例如：`compose(Math.pow)(4, 2)` 等效于 `Math.pow(4, 2)`
   * 返回 16
   * 注：参考 demo8
   */
  if (funcs.length === 1) {
    return funcs[0]
  }
  /**
   * 当 compose 接收 1 个以上函数实参时返回一个【函数组合】。
   * 例如：`compose(a, b, c, d)(1, 2, 3)`
   * 等效于 `( (...args) => a(b(c(d(...args)))) )(1, 2, 3)`
   * 注：参考 demo6
   */
  const last = funcs[funcs.length - 1] // 取倒数第 1 个被 compose 的函数
  const rest = funcs.slice(0, -1) // 取 0 至倒数第 2 个被 compose 的函数（数组）
  // 返回组合后的函数
  return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))

  /**
   * 例如：
   * compose(a, b, c, d) 时，last 为 d，rest 为 [a, b, c]。
   * 
   * Array.prototype.reduce 函数，第一个参数为计算函数，第二个参数为初始值，例如：
   * ['1', '2', '3'].reduce((accumulator, currentValue) => accumulator + currentValue, '0')
   * currentValue 的获取顺序从左到右
   * 所以返回的是 ((('0' + '1') + '2') + '3') 即："0123"
   * reduceRight 和 reduce 的区别就是 currentValue 的获取顺序从右到左
   * 所以返回的是 ((('0' + '3') + '2') + '1') 即："0321"
   * 
   * 回到 compose：
   * `rest.reduceRight((composed, f) => f(composed), last(...args))`
   * 等效于 `[a, b, c].reduceRight((composed, f) => f(composed), d(...args))`
   * accumulator（即 composed）接收：d(...args))
   * currentValue （即 f）接收：c
   * 
   * 看下 reduceRight 循环每次做了什么：
   * 第一次 composed 参数接收初始值 `d(...args)`，f 参数接收 c，所以返回的是 `c(d(...args))`
   * 第二次 composed 参数接收上一次的累积值 `c(d(...args))`，
   * f 参数接收 b，所以返回的是 `b(c(d(...args)))`
   * 第三次 composed 参数接收上一次的累积值`b(c(d(...args)))`，
   * f 参数接收 a，所以返回的是 `a(b(c(d(...args))))`
   * 
   * 所以 `rest.reduceRight((composed, f) => f(composed), last(...args))`
   * 等效于 `[a, b, c].reduceRight((composed, f) => f(composed), d(...args))`
   * 等效于 a(b(c(d(...args))))
   * 
   * 因此 compose(a, b, c, d)
   * 等效于 (...args) => a(b(c(d(...args))))
   */
}
