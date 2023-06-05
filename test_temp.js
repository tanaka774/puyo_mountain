let numcount = {};
for (let n = 1000; n >= 0; n--) {
  let num = Math.floor(Math.random() * 4) + 1;
  if (!(`${num}` in numcount)) numcount[`${num}`] = 0;
  numcount[`${num}`] += 1;
}
console.log(numcount);
