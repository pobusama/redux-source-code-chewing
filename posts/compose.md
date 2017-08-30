# compose —— 管道工

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第四篇文章。这次我们依然讲一个工具函数， 这个工具函数是 redux 中间件系统的重要基础，它就是 compose。

## compose 的用法
compose 工具函数的作用非常简单明了，就是把一组函数组合成一个函数。我们先来看它是怎么使用的。

```js
//demo6
import {compose} from 'redux';

const fnA = (obj) => {
    console.log('fnA begin');
    obj.a = 'a';
    return obj;
}
const fnB = (obj) => {
    console.log('fnB begin');
    obj.b = 'b';
    return obj;
}
const fnC = (obj) => {
    console.log('fnC begin');
    obj.c = 'c';
    return obj;
}
const fnD = (obj) => {
    console.log('fnD begin');
    obj.d = 'd';
    return obj;
}
let obj = {}
const composedFns = compose(fnA, fnB, fnC, fnD);
console.log( composedFns(obj) );
//fnD begin
//fnC begin
//fnB begin
//fnA begin
//{ d: 'd', c: 'c', b: 'b', a: 'a' }
```

`npm run demo6`可以验证结果，通过上面的代码，将 fnA、fnB、fnC、fnD 四个函数组装成了 composedFns 函数。这里的拼装形式十分特殊，是将一个函数的输出（返回值）作为另一个函数的输入（实参），而 compose 的顺序是从右往左，也就是将 fnD 作为第一个函数，接收 composedFns 函数的 obj 实参，它的返回值将作为 fnC 函数的实参，fnC 的返回值作为 fnB 的实参，以此类推，最终 fnA 函数的返回值即是 `composedFns(obj)` 的返回值。

如果有点晕，我们来看下等效代码：
```js
composedFns(obj);
// 等价于
fnA(fnB(fnC(fnD(obj))));
// 等价于
((obj) => { 
    console.log('fnD begin');
    obj.d = 'd';
    // fnD 处理完 obj 后通过 return 移交给 fnC
    console.log('fnC begin');
    obj.c = 'c';
    // fnC 处理完 obj 后通过 return 移交给 fnB
    console.log('fnB begin');
    obj.b = 'b';
    // fnB 处理完 obj 后通过 return 移交给 fnA
    console.log('fnA begin');
    obj.a = 'a';
    return obj;
})(obj)

```

为啥要把函数拆分成这样的形式，再组装起来呢？大家知道 Redux 遵循函数式编程风格，函数式编程要求细化每个函数的功能，再把拥有不同功能的函数组合成特定功能的函数，以此实现需求。

这里的 compose 只是函数组合的一种形式，它适用于处理 “管道” 数据流需求。我们的 demo6 就是一个例子，一个本来是 `{}` 的 obj 对象，在 “流经” fnD、 fnC、 fnB、fnA 函数 “管道” 后，最终被加工为 `{ d: 'd', c: 'c', b: 'b', a: 'a' }`。

这和中间件的模式是不是不谋而合呢？我们把这个问题留到下一篇讲，接下来，我们看看 compose 到底是如何组合函数的。

## compose 源码分析
```js
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
  // 返回 () => a(b(c(d())));

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

```