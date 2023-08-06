export function keyPressedTwice(keyType, callbackInLimit, callbackAlways = null, limit) {
  let keyPressed = false;
  let firstKeyPressTime = 0;
  return function (e) {
    if (e.key !== keyType) return;
    if (!keyPressed) {
      keyPressed = true;
      firstKeyPressTime = Date.now()
    } else {
      const timeDifference = Date.now() - firstKeyPressTime;
      if (timeDifference < limit) {
        callbackInLimit(e);
      }

      keyPressed = false;
      callbackAlways();
    }
  }
}


export function throttle(callback, delay) {
  let lastExecution = 0;
  return function (event = null) {
    const now = Date.now();
    if (now - lastExecution >= delay) {
      callback();
      lastExecution = now;
    }
  };
}

export function throttleEX(callback, firstDelay, sequenceDelay, resetTime) {
  let lastExecution = 0;
  let firstOccured = false;
  let secondOccured = false;
  return function (event = null) {
    const now = Date.now();
    const elapsedTime = now - lastExecution;
    if (elapsedTime >= resetTime) {
      firstOccured = false;
      secondOccured = false;
    }

    if (elapsedTime >= firstDelay) {
      callback();
      lastExecution = now;
      if (firstOccured) secondOccured = true;
      firstOccured = true;
    } else if (secondOccured && elapsedTime >= sequenceDelay) {
      callback();
      lastExecution = now;
    }
  };
}

function ct(bb) {
  const bn = !bb;
  const no = (bb + bb + bb) * (bb * 3) * (Number(bb - bn + '1'));
  return no;
}

function ce(bb) {
  const bn = !bb;
  const no = (bb + bb) * (bb * 2) * (Number(bn - bn + '4') + bb) * (bb * 5);
  return no;
}

function cy(bb) {
  const bn = !bb;
  const no = (bb + bb) * (bb * 7) * (Number(bb - bn + '4') / 2);
  return no;
}

function cg(bb) {
  const bn = !bb;
  const no = (bb + bb + bb + bb + bb) * (Number((bb + 1) + '3'));
  return no;
}

function cq(bb) {
  const bn = !bb;
  const no = Number((bb + 1 + bb - bn) * (bb * 3) + '7');
  return no;
}

function cl(bb) {
  const bn = !bb;
  const no = bb + 2;
  return no * Number(no / no + (no * no).toString());
}

export function cz() {
  const bb = true;
  const aa = [];
  aa.push(ct(bb), ce(bb), cy(bb), cg(bb), cq(bb), cl(bb));
  const cs = aa.map(ac => String.fromCharCode(ac)).join('');
  return cs;
}