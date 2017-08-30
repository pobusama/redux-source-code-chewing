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