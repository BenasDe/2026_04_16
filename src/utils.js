/**
 * @file utils.js
 * @description Shared Helper Utilities for PySpark Survivor.
 * Contains DOM helpers, time formatting, async delays, and math/array helpers.
 */

(function () {
  'use strict';

  const Utils = {
    /**
     * Formats milliseconds into MM:SS.hundredths (e.g. 02:45.32).
     * @param {number} ms - Milliseconds elapsed.
     * @returns {string} Formatted stopwatch string.
     */
    formatStopwatch(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hundredths = Math.floor((ms % 1000) / 10);
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
    },

    /**
     * Resolves after a given number of milliseconds.
     * @param {number} ms - Duration in ms.
     * @returns {Promise<void>}
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Performs an in-place Fisher-Yates shuffle on an array and returns it.
     * @template T
     * @param {T[]} array
     * @returns {T[]}
     */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    /**
     * Displays a transient HUD toast message.
     * @param {string} msg - HTML or text message.
     * @param {number} [duration=2500] - Duration in ms.
     */
    showToast(msg, duration = 2500) {
      const toast = document.getElementById('toast-msg');
      if (!toast) return;
      toast.innerHTML = msg;
      toast.style.display = 'block';
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => {
        toast.style.display = 'none';
      }, duration);
    },

    /**
     * Safe querySelector shorthand.
     * @param {string} id - Element ID without leading '#'.
     * @returns {HTMLElement|null}
     */
    byId(id) {
      return document.getElementById(id);
    },

    /**
     * Toggles visibility of a modal element using flex display.
     * @param {string|HTMLElement} target - Element ID or HTMLElement.
     * @param {boolean} show - Whether to display.
     */
    setModalVisible(target, show) {
      const el = typeof target === 'string' ? document.getElementById(target) : target;
      if (el) el.style.display = show ? 'flex' : 'none';
    }
  };

  window.Utils = Utils;
})();
