//  TODO: some type limitation of number range which is specific to typescript?

// for splitting and floating puyo
export interface baseSinglePuyo {
  posX: number;
  posY: number;
  color: number;
}

export function setSinglePuyo(puyo: baseSinglePuyo, x, y, color) {
  puyo.posX = x;
  puyo.posY = y;
  puyo.color = color;
}

// for current puyo
export interface baseManiPuyo {
  parentX: number;
  parentY: number;
  parentColor: number;
  childColor: number;
  angle: number;
}

export function setManiPuyo(puyo: baseManiPuyo, parentX, parentY, parentColor, childColor, angle) {
  puyo.parentX = parentX;
  puyo.parentY = parentY;
  puyo.parentColor = parentColor;
  puyo.childColor = childColor;
  puyo.angle = angle;
}
