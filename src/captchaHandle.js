let turnstileToken = null;

export function getTurnstileToken() {
  return turnstileToken;
}

export function renderTurnstileWidget(container) {
  if (window.turnstile) {
    window.turnstile.render(container, {
      sitekey: "0x4AAAAAABjqqBmx_j-RtuXq",
      callback: window.onTurnstileSuccess,
      "error-callback": window.onTurnstileError,
      "expired-callback": window.onTurnstileExpired,
    });
  }
}

window.onloadTurnstileCallback = function () {
  console.log("onloadTurnstileCallback is defined")
  const container = document.getElementById("turnstileContainer");
  if (!container) {
    console.error("Turnstile container not found");
    return;
  }

  renderTurnstileWidget(container);
};

window.onTurnstileSuccess = function (token) {
  console.log("Turnstile successful!");
  turnstileToken = token;
  document.getElementById('sendButton').disabled = false;
};

// Optional: Callback for when an error occurs
window.onTurnstileError = function (error) {
  console.error("Turnstile error:", error);
  turnstileToken = null;
  // Handle error, e.g., disable submit button, show message
  // document.getElementById('sendButton').disabled = true;
};

// Optional: Callback for when the token expires (e.g., after some inactivity)
window.onTurnstileExpired = function () {
  console.log("Turnstile token expired.");
  turnstileToken = null;
  // You might need to disable the submit button and/or reset the Turnstile widget
  // document.getElementById('sendButton').disabled = true;
};
