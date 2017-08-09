import {createStore} from 'redux';

// actionTypes
const ADD = 'add';

// reducer
const todos = (state = [], action) => {
    switch (action.type) {
        case ADD:
            return [...state, {...action.payload}];
        default:
            return state;
    }
}

// store
const store = createStore(todos);
const printState = store => 
    console.log(`current state:`, JSON.stringify(store.getState()));
printState(store); // 打印：current state: []

// subscribe
const subscribeA = store.subscribe(() => {
    printState(store);
    subscribeA();//取消 subscribeA 的监听
    const subscribeB = store.subscribe(() => console.log('subscribeB'));//增加 subscribeB 的监听
});


// dispatch
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn Redux',
        completed: false
    }
});
// 这里执行完后打印：current state: [{"text":"learn Redux","completed":false}]

store.dispatch({
    type: ADD,
    payload: {
        text: 'learn React',
        completed: false
    }
});
// 这里执行完后打印：subscribeB