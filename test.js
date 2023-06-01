const basePuyo = {
  parentX: 0,
  parentY: 0,
  parentColor: 1,
  childColor: 2,
  angle: 0,
  getChildPos: () => {
    let childX, childY;
    if (this.angle === 0) { childX = this.parentX; childY = this.parentY + 1; }
    else if (this.angle === 90) { childX = this.parentX - 1; childY = this.parentY; }
    else if (this.angle === 180) { childX = this.parentX; childY = this.parentY - 1; }
    else if (this.angle === 270) { childX = this.parentX + 1; childY = this.parentY; }
    return [childX, childY];
  },
  varshow: () => { return (this.parentX); }
};

const getChildPos = (puyo) => {
  let childX, childY;
  if (puyo.angle === 0) { childX = puyo.parentX; childY = puyo.parentY + 1; }
  else if (puyo.angle === 90) { childX = puyo.parentX - 1; childY = puyo.parentY; }
  else if (puyo.angle === 180) { childX = puyo.parentX; childY = puyo.parentY - 1; }
  else if (puyo.angle === 270) { childX = puyo.parentX + 1; childY = puyo.parentY; }
  return [childX, childY];
};

const newPuyo = { ...basePuyo };
newPuyo.parentX = 3;
const [x, y] = getChildPos(newPuyo);
console.log(newPuyo, x, y);
console.log(basePuyo);
console.log(basePuyo.varshow());
