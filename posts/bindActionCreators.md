# bindActionCreators —— 箭在弦上

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第三篇文章，第一篇中我们提及了分发 action 对象的方式：`dispatch()` 一个 action 生成器。

## 有个小麻烦
如果需要分发的 action 多了，你会见到类似下面的情况：
```js
// 分发 actionA
dispatch(actionCreatorA());
// 第二次分发 actionA
dispatch(actionCreatorA());
// 分发 actionB
dispatch(actionCreatorB());
```

我们知道重复的逻辑是可以封装的，所以我们试着定义一个函数来抽出公共部分：
```js
const bindActionCreator = (dispatch, actionCreator) => {
    return (...arg) => dispatch(actionCreator(...arg));
}
```
这样如果我们在第一次 dispatch 时将相应的 actionCreator 和 dispatch 绑定，后面使用就方便多了。
```js
// 改写一下例子1
actionCreatorA = bindActionCreator(dispatch, actionCreatorA);
actionCreatorB = bindActionCreator(dispatch, actionCreatorB);

// 分发 actionA
actionCreatorA();
// 第二次分发 actionA
actionCreatorA();
// 分发 actionB
actionCreatorB();
```
没优化前，我们每次都需要把 “箭” （action）放在 “弓” （dispatch）上，然后再 “拉弓射箭” （`dispatch(action)`），而优化后，我们只需要射箭就可以了，可谓 “箭在弦上”。
redux 开发者也为我们想到了这点，提供了一个工具函数 bindActionCreators。下面我们刷一遍它的源码。

## 源码分析

```js
function bindActionCreator(actionCreator, dispatch) {
  /**
   * 实际对 actionCreator 和 dispatch 进行绑定的地方
   * 使用 "..." 解构语法将传入 actionCreator 的实参
   * 原封不动传给绑定后的函数 
   */ 
  return (...args) => dispatch(actionCreator(...args))
}

export default function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    // 如果形参 actionCreators 传入的是单个 function 直接返回绑定后的函数。
    return bindActionCreator(actionCreators, dispatch)
  }
  // 无效参数校验
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
      `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  var keys = Object.keys(actionCreators)
  var boundActionCreators = {}
  // 遍历 actionCreators 对象上的函数集合，每个都进行 dispatch 绑定。
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  // 返回绑定后的函数集合
  return boundActionCreators
}
```
核心逻辑和我此前提到的一样，不过源码比我们讨论的更进一步：它不但提供了绑定单一 actionCreator 函数的方式（actionCreators 形参接收一个函数），还提供了绑定多个函数的方式（actionCreators 形参接收一个对象）。此外依然做了严谨的参数校验，写工具函数时，我们可以借鉴这种思路。

[暂不允许转载]