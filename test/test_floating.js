const floatingPuyo1 = {
  posX: 1,
  posY: 1,
  color: 1,
};

const floatingPuyo2 = {
  posX: 2,
  posY: 2,
  color: 2,
};

const floatingPuyo3 = {
  posX: 3,
  posY: 3,
  color: 3,
};

let floatingPuyos = [];
floatingPuyos.push(floatingPuyo1);
floatingPuyos.push(floatingPuyo2);
floatingPuyos.push(floatingPuyo3);

floatingPuyos =
  floatingPuyos.filter((cur) => cur["posX"] !== 2 && cur["posY"] !== 1);
console.log(floatingPuyos);
