import takeInput from "./script.js";

function testInputHandle() {
  document.addEventListener('keydown', e => {
    if (takeInput()) {
      if (e.key === 'c') {
        console.log("I was pushed!!!")
      }
    }
  })
}
