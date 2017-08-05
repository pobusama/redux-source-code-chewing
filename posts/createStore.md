# 繁华的起点 —— createStore
这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第一篇文章，我们就从 Redux 库的核心文件 —— createStore.js 开始研读。讲道理，Redux 库跟外面其他妖艳的 JS 库不一样，[配套注释十分详细](https://github.com/pobusama/redux-source-code-chewing/blob/master/source-code/createStore.js)，阅读下来就跟读思路清晰的文章感受差不多。嗯，是个正经的 JS 库。

**提示：本文章基于 Redux 的 3.6.0 版本**

## 