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
const subscribeA = store.subscribe(() => {
    console.log('subscribeA do this:')
    printState(store);
});
const subscribeB = store.subscribe(() => {
    console.log('subscribeB do this:')
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

// unsubscribe
subscribeB();

// dispatch
store.dispatch({
    type: ADD,
    payload: {
        text: 'learn React',
        completed: false
    }
});