# combineReducers —— 涓涓溪流，可成江海

这是本 [Redux 源码阅读历程](https://github.com/pobusama/redux-source-code-chewing)的第二篇文章，在第一篇文章[我简单提到了 reducer](https://github.com/pobusama/redux-source-code-chewing/blob/master/posts/createStore.md#触发-state-的变化--dispatch)，这也是 Redux 里的一个重要概念。

我们常常会在营销活动广告的角落里找到一行字：“最终解释权归主办方所有”。也就是说你按照活动规则完成任务以后，怎么获得奖励以及获得多少奖励，由 “主办方” 说了算。而在 Redux 中，触发了一个 action，这个 action 通过什么方案改变 state，改变 state 的哪些部分，由 reducer 说了算，它就是所谓的 “主办方“，或者更具体来说是 ”主办方“ 的解释规则。