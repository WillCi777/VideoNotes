/**
 * PLATFORM — MESSAGING
 *
 * Messaging helpers shared by UI contexts.
 */

const TRANSLATION_MESSAGE_TIMEOUT_MS = 130_000;

/**
 * Prevent a stopped service worker or dead message channel from leaving the
 * transcript queue stuck forever. The underlying browser message cannot be
 * cancelled, so settled guards deliberately ignore any late response.
 *
 * @param {Object} message - chrome.runtime message payload
 * @param {number} timeoutMs - Watchdog timeout
 * @returns {Promise<Object>}
 */
function sendTranslationMessage(message, timeoutMs = TRANSLATION_MESSAGE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };

    timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error(
          `Translation request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please Retry.`,
        ),
      );
    }, timeoutMs);

    let messagePromise;
    try {
      messagePromise = chrome.runtime.sendMessage(message);
    } catch (error) {
      finish(reject, error);
      return;
    }

    Promise.resolve(messagePromise).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
  });
}
