# Redux 源码阅读历程
![](https://camo.githubusercontent.com/f28b5bc7822f1b7bb28a96d8d09e7d79169248fc/687474703a2f2f692e696d6775722e636f6d2f4a65567164514d2e706e67)
接触 Redux 一段时间了，对其用法也稍有熟悉。但本着宝贵的探索精神，要知其然，更要知其所以然，我决定从今天（2017-08-03）开始，以自己的角度阅读和探索 Redux 源码，学习其编码思想，长在自己的知识树上。

## 写在开始
我不管，自己先给自己来颗✨

第一次写源码阅读计划，没啥经验，就试着规划一下本项目将要做的事情吧。

Redux 库十分简洁，只有 5 个 API 文件，我根据关联度，对它们排个序，后面也会按照这个顺序书写心得。

- `createStore.js`
- `combineReducers.js`
- `bindActionCreators.js`
- `compose.js`
- `applyMiddleware.js`

既然没啥经验，就以自己认为的重要度一一分析这几个文件吧。围绕着每个文件，我会首先通过预览抽取出文件中使用得比较精髓的原生 API，然后再站在熟悉这些原生 API 的基础上分析文件，最后把理解思路整理成文章。总而言之我希望自己基本做到以下几个步骤：
1. 预习文件中的 API
2. 回顾 Redux API 的用法
3. 分析 Redux API
4. 总结可以用于实战的思想

这几个步骤可能会同时出现在一篇文章中，也有可能限于篇幅拆分至两篇或多篇文章中，反正按小爷我自己的节奏。😄

## 上车指南
1. ES6
2. 熟悉 Redux (可以看我的[另外一篇文章](http://pobusama.github.io/2016/12/31/React%E6%8A%80%E6%9C%AF%E6%A0%88%E6%8E%A2%E7%A9%B6-Redux/))
3. A little bit 函数式编程

## 文章列表
- [ createStore —— 繁华的起点（2017.08.07）](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/createStore.md)
- [ combineReucers —— 涓涓溪流，可成江海（2017.08.15）](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/combineReducers.md)
- [ bindActionCreators —— 箭在弦上（2017.08.22）](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/bindActionCreators.md)
- [ compose —— 管道工（2017.08.30）](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/compose.md)
- [applyMiddleware —— Redux 的拓展坞（2017.09.03）](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/applyMiddleware.md)

## 文章提及 demo 使用方式
1. 克隆仓库：`git clone https://github.com/pobusama/redux-source-code-chewing.git && cd redux-source-code-chewing`
2. 安装依赖包：`npm i`
3. 运行 demo（如 demo1）：`npm run demo1`