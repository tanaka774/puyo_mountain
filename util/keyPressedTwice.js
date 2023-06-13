export default function keyPressedTwice(keyType, callbackInLimit, callbackAlways = null, limit) {
  let keyPressed = false;
  let firstKeyPressTime = 0;
  return function(e) {
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


