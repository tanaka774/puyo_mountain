export function drawGlueToDown(ctx, cellSize, x1, y1, x2, y2, radiusX, radiusY, color) {
  x1 *= cellSize; x1 += cellSize / 2;
  x2 *= cellSize; x2 += cellSize / 2;
  y1 *= cellSize; y1 += cellSize / 2;
  y2 *= cellSize; y2 += cellSize / 2;
  const elliCenterX = (x1 + x2) / 2;
  const elliCenterY = (y1 + y2) / 2;
  const xElliMod = radiusX * 4 / 5;
  const yElliMod = radiusY / 3;
  const xContMod = radiusX / 5;

  const leftStartX = x1 - xElliMod;
  const leftStartY = y1 + yElliMod;
  const leftContX = elliCenterX - xContMod;
  const leftContY = elliCenterY;
  const leftEndX = x2 - xElliMod;
  const leftEndY = y2 - yElliMod;
  const rightStartX = x1 + xElliMod;
  const rightStartY = y1 + yElliMod;
  const rightContX = elliCenterX + xContMod;
  const rightContY = elliCenterY;
  const rightEndX = x2 + xElliMod;
  const rightEndY = y2 - yElliMod;

  ctx.beginPath();
  ctx.moveTo(leftStartX, leftStartY);
  ctx.quadraticCurveTo(leftContX, leftContY, leftEndX, leftEndY);
  ctx.lineTo(elliCenterX, leftEndY);
  ctx.lineTo(elliCenterX, leftStartY);
  // ctx.stroke();

  // ctx.beginPath();
  ctx.moveTo(rightStartX, rightStartY);
  ctx.quadraticCurveTo(rightContX, rightContY, rightEndX, rightEndY);
  ctx.lineTo(elliCenterX, rightEndY);
  ctx.lineTo(elliCenterX, rightStartY);
  // ctx.stroke();
  // ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

export function drawGlueToRight(ctx, cellSize, x1, y1, x2, y2, radiusX, radiusY, color) {
  x1 *= cellSize; x1 += cellSize / 2;
  x2 *= cellSize; x2 += cellSize / 2;
  y1 *= cellSize; y1 += cellSize / 2;
  y2 *= cellSize; y2 += cellSize / 2;
  const ud_elliCenterX = (x1 + x2) / 2;
  const ud_elliCenterY = (y1 + y2) / 2;
  const ud_xElliMod = radiusX * 1 / 4;
  const ud_yElliMod = radiusY * 5 / 5;
  const ud_yContMod = radiusY / 5;

  const upperStartX = x2 + ud_xElliMod;
  const upperStartY = y2 - ud_yElliMod;
  const upperContX = ud_elliCenterX;
  const upperContY = ud_elliCenterY + ud_yContMod;
  const upperEndX = x1 - ud_xElliMod;
  const upperEndY = y1 - ud_yElliMod;
  const downStartX = x2 + ud_xElliMod;
  const downStartY = y2 + ud_yElliMod;
  const downContX = ud_elliCenterX;
  const downContY = ud_elliCenterY - ud_yContMod;
  const downEndX = x1 - ud_xElliMod;
  const downEndY = y1 + ud_yElliMod;

  ctx.beginPath();
  ctx.moveTo(upperStartX, upperStartY);
  ctx.quadraticCurveTo(upperContX, upperContY, upperEndX, upperEndY);
  ctx.lineTo(upperEndX, ud_elliCenterY);
  ctx.lineTo(upperStartX, ud_elliCenterY);
  // ctx.stroke();

  // ctx.beginPath();
  ctx.moveTo(downStartX, downStartY);
  ctx.quadraticCurveTo(downContX, downContY, downEndX, downEndY);
  ctx.lineTo(downEndX, ud_elliCenterY);
  ctx.lineTo(downStartX, ud_elliCenterY);

  ctx.fillStyle = color;
  ctx.fill();
}

export function drawEllipse(ctx, X, Y, radiusX, radiusY, color, willStorke = true) {
  // Draw the ellipse
  ctx.beginPath();
  ctx.ellipse(X, Y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,150,150,0.5)';
  ctx.lineWidth = 2;
  (willStorke) && ctx.stroke();
}

export function drawEyes(ctx, X, Y) {
  // Draw the eyes
  const rate = 1 / 4;
  const eyeRadiusX = 6 * rate;
  const eyeRadiusY = 4 * rate;
  const eyeOffsetX = 15 * rate;
  const eyeOffsetY = 10 * rate;
  const eyeColor = 'rgba(20,20,20,0.7)';

  // Left eye
  ctx.beginPath();
  ctx.ellipse(X - eyeOffsetX, Y - eyeOffsetY, eyeRadiusX, eyeRadiusY, (-1) * Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = eyeColor;
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(X + eyeOffsetX, Y - eyeOffsetY, eyeRadiusX, eyeRadiusY, Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = eyeColor;
  ctx.fill();
}

export function addAlpha(rgbaCode, alpha) {
  const res = rgbaCode.split(',')[0] + ',' + rgbaCode.split(',')[1] + ',' + rgbaCode.split(',')[2] + ',' + ` ${alpha.toString()})`;
  return res;
}


