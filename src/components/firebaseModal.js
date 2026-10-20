import { FIREBASE_CONFIG_KEY, CACHED_API_CONFIG_KEY, DEFAULT_FIREBASE_CONFIG } from '../utils/constants.js';
import { parseFirebaseConfig } from '../services/storage.js';
import { showToast } from '../utils/helpers.js';

let reinitFirebaseCallback = null;
let setCloudStatusCallback = null;

export function initFirebaseModal({ onReinitFirebase, onSetCloudStatus }) {
  reinitFirebaseCallback = onReinitFirebase;
  setCloudStatusCallback = onSetCloudStatus;

  const openFirebaseModalBtn = document.getElementById('openFirebaseModalBtn');
  const closeFirebaseModalBtn = document.getElementById('closeFirebaseModalBtn');
  const firebaseModal = document.getElementById('firebaseModal');
  const saveFirebaseConfigBtn = document.getElementById('saveFirebaseConfigBtn');
  const disconnectFirebaseBtn = document.getElementById('disconnectFirebaseBtn');

  if (openFirebaseModalBtn) {
    openFirebaseModalBtn.addEventListener('click', showFirebaseModal);
  }

  if (closeFirebaseModalBtn) {
    closeFirebaseModalBtn.addEventListener('click', hideFirebaseModal);
  }

  if (firebaseModal) {
    firebaseModal.addEventListener('click', (e) => {
      if (e.target === firebaseModal) hideFirebaseModal();
    });
  }

  if (saveFirebaseConfigBtn) {
    saveFirebaseConfigBtn.addEventListener('click', saveFirebaseConfig);
  }

  if (disconnectFirebaseBtn) {
    disconnectFirebaseBtn.addEventListener('click', disconnectFirebase);
  }
}

export function showFirebaseModal() {
  const firebaseConfigTextarea = document.getElementById('firebaseConfigTextarea');
  const firebaseModal = document.getElementById('firebaseModal');
  const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);

  if (firebaseConfigTextarea) {
    if (savedConfig && savedConfig !== 'DISABLED') {
      firebaseConfigTextarea.value = savedConfig;
    } else if (!savedConfig && typeof DEFAULT_FIREBASE_CONFIG === 'object' && DEFAULT_FIREBASE_CONFIG) {
      firebaseConfigTextarea.value = JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
    }
  }

  if (firebaseModal) {
    firebaseModal.classList.remove('modal-enter');
    firebaseModal.classList.add('modal-show');
  }
}

export function hideFirebaseModal() {
  const firebaseModal = document.getElementById('firebaseModal');
  if (firebaseModal) {
    firebaseModal.classList.remove('modal-show');
    firebaseModal.classList.add('modal-enter');
  }
}

function saveFirebaseConfig() {
  const firebaseConfigTextarea = document.getElementById('firebaseConfigTextarea');
  if (!firebaseConfigTextarea) return;

  const rawText = firebaseConfigTextarea.value.trim();
  if (!rawText) {
    showToast("Vui lòng dán đoạn mã firebaseConfig!", "error");
    return;
  }

  try {
    const parsed = parseFirebaseConfig(rawText);
    if (!parsed || !parsed.databaseURL) {
      showToast("Cấu hình không hợp lệ hoặc thiếu databaseURL (vào Realtime Database tạo database trước)!", "error");
      return;
    }

    localStorage.setItem(FIREBASE_CONFIG_KEY, rawText);
    localStorage.removeItem(CACHED_API_CONFIG_KEY);
    hideFirebaseModal();
    showToast("Đang kết nối tới Firebase...", "info");
    if (reinitFirebaseCallback) reinitFirebaseCallback();
  } catch (e) {
    showToast("Lỗi định dạng cấu hình: " + e.message, "error");
  }
}

function disconnectFirebase() {
  localStorage.setItem(FIREBASE_CONFIG_KEY, 'DISABLED');
  localStorage.removeItem(CACHED_API_CONFIG_KEY);
  if (setCloudStatusCallback) setCloudStatusCallback('local', 'Đã chuyển về LocalStorage');
  hideFirebaseModal();
  showToast("Đã chuyển về chế độ LocalStorage trên máy", "info");
}
