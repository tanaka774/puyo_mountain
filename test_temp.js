const obj1 = { a: 1, b: 2 };
const obj2 = { a: 2, b: 2 };
const obj3 = { a: 3, b: 2 };
let arr = [obj1, obj2, obj3]
arr = arr.filter((cur) => cur["a"] === 2 && cur["b"] === 2)
// arr = arr.filter((cur) => cur["a"] !== 3)
// arr = arr.filter((cur) => cur["a"] !== 1)
console.log(arr) 
