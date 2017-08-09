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
    subscribeA();
    // dispatch
    store.dispatch({
        type: ADD,
        payload: {
            text: 'learn Redux',
            completed: false
        }
    });
});

// dispatch 
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn React',
        completed: false
    }
});

