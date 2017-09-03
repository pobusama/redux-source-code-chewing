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

这和中间件的模式是不是有些相似呢？我们把这个问题留到下一篇讲，接下来，我们看看 compose 到底是如何组合函数的。

## compose 源码分析

### reduce 和 reduceRight
磨刀不误砍柴功，理解 compose 源码之前，充分理解一个原生数组 API —— reduce（reduceRight）十分关键。对这个 API 比较陌生的同学理解起来还是会比较扰的，我们通过例子来理解：

```js
['1', '2', '3'].reduce((accumulator, currentValue) => accumulator + currentValue, '0')
// => 0123
```
这行代码发生了什么？
首先，reduce 接收两个参数，第一个是函数（我们称为累加器函数），第二个是初始值（如果不传初始值就以 arr[0] 作为初始值）。
接着，累加器函数接收两个参数，第一个是 accumulator 即累计值，第二个是 currentValue 即当前值。
在首次计算中，累加器会以初始值（这里为 '0'）为 accumulator，以 `arr[0]` 作为 currentValue，**累加器返回的结果作为下一次累加的 accumulator，而下一次累加的 currentValue 为从左到右的数组元素**，这里的顺序是 `arr[1]` 到 `arr[length - 1]`。

所以这行代码实际上可以看作：
```js
((('0' + '1') + '2') + '3')
// => 0123
```

而 reduceRight 和 reduce 的区别是取 currentValue 的顺序，从数组的最后一个元素开始取，即从右往左。

```js
['1', '2', '3'].reduceRight((accumulator, currentValue) => accumulator + currentValue, '0')
//等效于
((('0' + '3') + '2') + '1')
// => 0321
```
这里初始值 '0' 不变，而 currentValue 取值顺序改变。

### 回到 compose 

首先，compose 函数区分了不同参数个数的情况：
```js
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
  //...
}
```

接着，我们着重看一下接收 1 个以上参数时的情况：
```js
export default function compose(...funcs) {
  //...
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
   * `rest.reduceRight((composed, f) => f(composed), last(...args))`
   * 等效于 `[a, b, c].reduceRight((composed, f) => f(composed), d(...args))`
   * composed（即 accumulator）接收：d(...args))
   * f（即 currentValue）接收：c
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
```

## 总结
通过探索 Redux 实现的 compose 工具函数，我主要收获了以下两点
1. 函数式编程中存在着一种 “管道” 思想，即通过多个函数组合成的 “管道”，对 “流过” 的数据进行处理，最终输出处理后的数据。
2. reduce/reduceRight 的用法实践。由于 “函数是一等公民”，其地位等同于其他数据类型，所以 reduce/reduceRight 也可以用来累计一组函数。