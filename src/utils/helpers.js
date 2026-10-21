/**
 * Escape chuỗi HTML an toàn
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

/**
 * Hiển thị thông báo Toast
 */
export function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');

  let border = 'border-slate-700 bg-slate-900 text-slate-200';
  let icon = 'ℹ️';

  if (type === 'success') {
    border = 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100';
    icon = '✅';
  } else if (type === 'error') {
    border = 'border-rose-500/40 bg-rose-950/90 text-rose-100';
    icon = '⚠️';
  } else if (type === 'warning') {
    border = 'border-amber-500/40 bg-amber-950/90 text-amber-100';
    icon = '🔔';
  }

  toast.className = `flex items-center space-x-2.5 px-4 py-3 rounded-2xl border ${border} shadow-2xl text-xs font-semibold backdrop-blur-md transform transition-all duration-300 translate-y-3 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Tự động nhận diện khung giờ bữa ăn theo thời gian thực tại TP.HCM
 */
export function detectMealByCurrentTime() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;

  if (hours >= 5.0 && hours < 10.5) {
    return 'sang';
  } else if (hours >= 10.5 && hours < 14.5) {
    return 'trua';
  } else {
    return 'toi';
  }
}

/**
 * Hiệu ứng pháo hoa giấy (Canvas Confetti)
 */
export function launchConfetti() {
  if (typeof window.confetti !== 'function') return;

  const count = 200;
  const defaults = { origin: { y: 0.7 } };

  function fire(particleRatio, opts) {
    window.confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
