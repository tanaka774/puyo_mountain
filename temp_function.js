var keyPressed = false;      // Flag to track if the key was already pressed
var firstKeyPressTime = 0;  // Timestamp of the first key press

document.addEventListener('keydown', function(event) {
  if (!keyPressed) {
    // First key press
    keyPressed = true;
    firstKeyPressTime = event.timeStamp;
  } else {
    // Second key press
    var timeDifference = event.timeStamp - firstKeyPressTime;
    if (timeDifference < 500) {  // Adjust the time frame as needed (in milliseconds)
      // Key pressed twice within the specified time frame
      console.log('Key pressed twice!');
      // Do something with the input here
    }
    keyPressed = false;  // Reset the flag
  }
});
