(function () {
  'use strict';

  const Utils = {
    formatStopwatch(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const hundredths = Math.floor((ms % 1000) / 10);
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
    },

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

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

    byId(id) {
      return document.getElementById(id);
    },

    setModalVisible(target, show) {
      const el = typeof target === 'string' ? document.getElementById(target) : target;
      if (el) el.style.display = show ? 'flex' : 'none';
    }
  };

  window.Utils = Utils;
})();
