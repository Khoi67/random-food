import { hashPin } from '../services/storage.js';
import { syncAdminPinToCloud } from '../services/firebase.js';
import { ADMIN_PIN_HASH_KEY, OLD_ADMIN_PIN_KEY, DEFAULT_ADMIN_PIN_HASH } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';

let isAdminAuthenticated = false;
let pendingAdminCallback = null;
let currentPinHash = DEFAULT_ADMIN_PIN_HASH;

export function getIsAdmin() {
  return isAdminAuthenticated;
}

export function getCurrentPinHash() {
  return currentPinHash;
}

export function setCurrentPinHash(hash) {
  currentPinHash = hash;
}

export function initAdminModal({ initialPinHash }) {
  if (initialPinHash) currentPinHash = initialPinHash;

  const adminLockBtn = document.getElementById('adminLockBtn');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const adminModal = document.getElementById('adminModal');
  const adminPinForm = document.getElementById('adminPinForm');
  const logoutAdminBtn = document.getElementById('logoutAdminBtn');
  const saveNewPinBtn = document.getElementById('saveNewPinBtn');

  if (adminLockBtn) {
    adminLockBtn.addEventListener('click', () => {
      showAdminModal();
    });
  }

  if (closeAdminModalBtn) {
    closeAdminModalBtn.addEventListener('click', hideAdminModal);
  }

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) hideAdminModal();
    });
  }

  if (adminPinForm) {
    adminPinForm.addEventListener('submit', handleAdminPinSubmit);
  }

  if (logoutAdminBtn) {
    logoutAdminBtn.addEventListener('click', logoutAdmin);
  }

  if (saveNewPinBtn) {
    saveNewPinBtn.addEventListener('click', handleSaveNewPin);
  }

  updateAdminUI(false);
}

export function requireAdminPermission(actionName, callback) {
  if (isAdminAuthenticated) {
    callback();
    return;
  }

  pendingAdminCallback = callback;
  const adminPinInput = document.getElementById('adminPinInput');
  if (adminPinInput) adminPinInput.value = '';
  showAdminModal();
}

export function showAdminModal() {
  const adminModal = document.getElementById('adminModal');
  const logoutAdminBtn = document.getElementById('logoutAdminBtn');
  const changePinSection = document.getElementById('changePinSection');
  const adminPinInput = document.getElementById('adminPinInput');

  if (!adminModal) return;

  if (isAdminAuthenticated) {
    if (logoutAdminBtn) logoutAdminBtn.classList.remove('hidden');
    if (changePinSection) changePinSection.classList.remove('hidden');
  } else {
    if (logoutAdminBtn) logoutAdminBtn.classList.add('hidden');
    if (changePinSection) changePinSection.classList.add('hidden');
  }

  adminModal.classList.remove('modal-enter');
  adminModal.classList.add('modal-show');
  if (adminPinInput) {
    setTimeout(() => adminPinInput.focus(), 150);
  }
}

export function hideAdminModal() {
  const adminModal = document.getElementById('adminModal');
  if (adminModal) {
    adminModal.classList.remove('modal-show');
    adminModal.classList.add('modal-enter');
  }
  pendingAdminCallback = null;
}

async function handleAdminPinSubmit(e) {
  e.preventDefault();
  const adminPinInput = document.getElementById('adminPinInput');
  if (!adminPinInput) return;

  const enteredPin = adminPinInput.value.trim();
  if (!enteredPin) return;

  const enteredHash = await hashPin(enteredPin);
  const targetHash = currentPinHash || localStorage.getItem(ADMIN_PIN_HASH_KEY) || DEFAULT_ADMIN_PIN_HASH;

  if (enteredHash === targetHash) {
    isAdminAuthenticated = true;
    updateAdminUI(true);
    hideAdminModal();
    showToast("Đã mở khóa quyền Admin thành công!", "success");

    if (typeof pendingAdminCallback === 'function') {
      const action = pendingAdminCallback;
      pendingAdminCallback = null;
      action();
    }
  } else {
    showToast("Mã PIN không chính xác! Vui lòng thử lại", "error");
    adminPinInput.value = '';
    adminPinInput.focus();
  }
}

export function updateAdminUI(isAdmin) {
  const adminLockBtn = document.getElementById('adminLockBtn');
  const adminLockIcon = document.getElementById('adminLockIcon');
  const adminLockText = document.getElementById('adminLockText');

  if (!adminLockBtn) return;

  if (isAdmin) {
    if (adminLockIcon) adminLockIcon.textContent = "🔓";
    if (adminLockText) adminLockText.textContent = "Admin";
    adminLockBtn.className = "text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white px-2.5 py-1.5 sm:py-2 rounded-xl border border-amber-500/40 transition flex items-center space-x-1.5 cursor-pointer shadow-sm";
  } else {
    if (adminLockIcon) adminLockIcon.textContent = "🔒";
    if (adminLockText) adminLockText.textContent = "Khách";
    adminLockBtn.className = "text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer";
  }
}

export function logoutAdmin() {
  isAdminAuthenticated = false;
  updateAdminUI(false);
  hideAdminModal();
  showToast("Đã khóa quyền Admin (Chế độ Khách)", "info");
}

async function handleSaveNewPin() {
  const newPinInput = document.getElementById('newPinInput');
  const saveNewPinBtn = document.getElementById('saveNewPinBtn');
  if (!newPinInput || !saveNewPinBtn) return;

  const newPin = newPinInput.value.trim();
  if (!newPin || newPin.length < 4) {
    showToast("Mã PIN mới phải từ 4 ký tự trở lên!", "warning");
    return;
  }

  saveNewPinBtn.disabled = true;
  saveNewPinBtn.textContent = "Đang lưu...";

  try {
    const newHash = await hashPin(newPin);
    currentPinHash = newHash;
    localStorage.setItem(ADMIN_PIN_HASH_KEY, newHash);
    localStorage.removeItem(OLD_ADMIN_PIN_KEY);

    syncAdminPinToCloud(newHash);
    showToast("Đã đổi mã PIN Admin & đồng bộ Cloud!", "success");
    newPinInput.value = '';
  } catch (err) {
    console.error("Lỗi đổi PIN:", err);
    showToast("Lỗi khi lưu mã PIN: " + err.message, "error");
  } finally {
    saveNewPinBtn.disabled = false;
    saveNewPinBtn.textContent = "Đổi PIN";
  }
}
