// note: bad security to listen to message on window, but it's just a demo for now

// listen for messagj from content.js in MAIN world
window.addEventListener("message", (event) => {
  // only accept message from same origin
  if (event.source !== window) return;

  if (event.data.message === "fingerprint_detected") {
    // forward to message to the service worker
    chrome.runtime.sendMessage(event.data);
  }
});
