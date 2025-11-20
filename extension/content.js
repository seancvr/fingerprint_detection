/*
 * Monkey Patching / Method Wrapping approach:
 * 1: Save original reference to native prototype methods
 * 2: Replace native prototype method with wrapper function
 * 3: Wrapper function logic:
 *    a) Execute custom logic (log, increment counter, call fingerprintCheck())
 *    b) Call the original method using .apply() with 'this' context and arguments
 *    c) Return the original method's result
 *
 * Example of WebGL getParameter method after the wrapper() function returns:
 * WebGLRenderingContext.prototype.getParameter = function (...args) {
 *   console.log("WebGLRenderingContext.getParameter() detected.");
 *   apiCallTracker.webGL.count++;
 *   apiCallTracker.webGL.timestamp = performance.now();
 *   fingerprintCheck();
 *   return nativeWebGLRenderingContext.apply(this, args);
 * };
 *
 * Notes about prototypes and inheritance in this context:
 * - HTMLCanvasElement is a constructor function (built into browsers)
 * - Constructor functions create objects and set up their prototype chain
 * - .prototype is the object that all canvas elements inherit from
 * - toDataURL is a method on that prototype
 * - canvas elements created on the page inherit methods from the prototype
 * - wrapper function swaps the native method for the modified one
 * - the use of apply(), 'this' and args is critical to wrapper method approach
 * - 'this' preserves the context of which canvas element the toDataUrl method is called on, <canvas element>
 * - args preserves the arguments with which it is called, toDataUrl('image/png', 0.95)
 * - return nativeToDataURL.apply(this, args); ->
 * - nativeToDataURL.call(<canvas element>, 'image/png', 0.95)
 *
 * Benefits of using IIFE:
 * - Creates private scope / encapsulation of variables (e.g. API_THRESHOLD)
 * - Variables not accessible from browser console or other scripts
 * - Prevents global namespace pollution
 * - Prevents easy direct detection of detection logic
 * - Prevents easy bypass of wrapper functions via state manipulation
 * - Only modified prototype methods are exposed to the page
 *
 * Notes about closures:
 * - A closure is when a function "remembers" and can access variables from its outer scope
 * - The IIFE creates a closure where inner functions retain access to IIFE variables
 * - Even after the IIFE finishes executing, the wrapper functions can still access:
 *   - API_THRESHOLD, FINGERPRINT_WINDOW, SESSION_TIMEOUT, etc.
 *   - apiCallTracker object and its state
 *   - fingerprintDetected flag
 *   - fingerprintCheck() and resetDetection() functions
 * - This closure keeps these variables "alive" and private while the wrapper functions continue to use them
 * - The wrapper functions are "closed over" the IIFE's scope, creating a secure private state
 *
 * Notes on the reset and timer logic:
 * - On each call of fingerprintCheck() a resetTimout function is called
 * - On the first confirmed fingerprint detection a warningTimout function called
 * - The warning message will only fire QUIET_PERIOD milliseconds after the last api detection
 * - The resetDetection() function will only fire SESSION_TIMEOUT milliseconds after the last api detection
 * - The setTimeout function call returns a <timeout id> value which is stored in warningTimeout resetTimeout
 * - That is how that how timeouts can be cleared and reset during each cycle of fingerprintCheck()
 * - clearTimeout is a builtin function
 */

(function () {
  // DETECTION PATTERN PARAMAETERS
  const API_THRESHOLD = 2;
  const FINGERPRINT_WINDOW = 50;

  // TIMER PARAMETERS
  const QUIET_PERIOD = 100;
  const SESSION_TIMEOUT = 4000;

  // TIMER CONTROL VARIABLES
  let warningTimeout = null;
  let resetTimeout = null;
  let fingerprintDetected = false;

  // DETECTION STATE OBJECT
  const apiCallTracker = {
    canvas: { count: 0, timestamp: null },
    audio: { count: 0, timestamp: null },
    webGL: { count: 0, timestamp: null },
  };

  // RESET STATE AFTER SESSION TIMOUT
  function resetDetection() {
    fingerprintDetected = false;
    apiCallTracker.canvas = { count: 0, timestamp: null };
    apiCallTracker.audio = { count: 0, timestamp: null };
    apiCallTracker.webGL = { count: 0, timestamp: null };
    console.log("🔄 Detection reset - ready for new fingerprint attempt");
  }

  // ======
  // MAIN FINGERPRINT DETECTION LOGIC
  // =====
  function fingerprintCheck() {
    // clear previous resetTimout and set a new one
    clearTimeout(resetTimeout); // -> clearTimout(<previous id>)
    resetTimeout = setTimeout(resetDetection, SESSION_TIMEOUT); // -> resetTime = <new timout id>

    const timestamps = [
      apiCallTracker.canvas.timestamp,
      apiCallTracker.audio.timestamp,
      apiCallTracker.webGL.timestamp,
    ].filter((t) => t !== null);

    if (timestamps.length >= API_THRESHOLD) {
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const timeFrame = maxTime - minTime;

      if (timeFrame <= FINGERPRINT_WINDOW && !fingerprintDetected) {
        // clear and set warning timeout
        clearTimeout(warningTimeout);
        warningTimeout = setTimeout(() => {
          fingerprintDetected = true;
          console.log(
            `🚨 Likely Fingerprinting detected. ${
              timestamps.length
            } different API calls detected within ${timeFrame.toFixed(2)}ms`
          );

          // send message to background script via relay.js via window
          window.postMessage(
            { message: "fingerprint_detected" },
            window.location.origin
          );
        }, QUIET_PERIOD);
      }
    }
  }

  // =====
  // WRAPPING THE NATIVE API METHODS
  // =====

  // Save original reference to native prototype methods
  const nativeToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const nativeStartRendering = OfflineAudioContext.prototype.startRendering;
  const nativeWebGLRenderingContext =
    WebGLRenderingContext.prototype.getParameter;

  // wrapper template function
  function wrapper(apiName, key, nativeMethod) {
    return function (...args) {
      console.log(`${apiName} detected`);
      apiCallTracker[key].count++;
      apiCallTracker[key].timestamp = performance.now();
      fingerprintCheck();
      return nativeMethod.apply(this, args);
    };
  }

  // canvas method wrapper
  HTMLCanvasElement.prototype.toDataURL = wrapper(
    "canvas.toDataURL",
    "canvas",
    nativeToDataURL
  );

  // audio method wrapper
  OfflineAudioContext.prototype.startRendering = wrapper(
    "OfflineAudioContext.startREndering()",
    "audio",
    nativeStartRendering
  );

  // webGL method wrapper
  WebGLRenderingContext.prototype.getParameter = wrapper(
    "WebGLRenderingContext.getParameter()",
    "webGL",
    nativeWebGLRenderingContext
  );

  console.log("Fingerprint detection intitialized");
})();
