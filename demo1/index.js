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
printState(store);

// subscribe
store.subscribe(() => {
    printState(store);
});

// dispatch
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn Redux',
        completed: false
    }
});

