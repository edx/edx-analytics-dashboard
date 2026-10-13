/**
 * React's development build (the one Karma uses) replays an error thrown while rendering inside a
 * synthetic DOM event, so browser debuggers treat it as uncaught. The browser then reports it to
 * window.onerror, and Jasmine fails the running spec, even when an error boundary handled the error.
 * Production builds don't do this.
 *
 * Specs that render a component that is expected to throw call this in beforeEach and the returned
 * function in afterEach. Only errors whose message contains one of the given texts are ignored; any
 * other error still reaches Jasmine.
 */
export default function ignoreExpectedErrors(messages) {
  const previousOnError = window.onerror;
  window.onerror = function onExpectedError(message, ...rest) {
    if (messages.some(expected => String(message).indexOf(expected) !== -1)) {
      return true;
    }
    return previousOnError ? previousOnError.call(window, message, ...rest) : false;
  };
  return () => {
    window.onerror = previousOnError;
  };
}
