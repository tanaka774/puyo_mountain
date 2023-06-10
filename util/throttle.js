export default function throttle(callback, delay) {
  let lastExecution = 0;
  return function(event = null) {
    const now = Date.now();
    if (now - lastExecution >= delay) {
      callback();
      lastExecution = now;
    }
  };
}
