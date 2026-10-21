/**
 * QUẢN LÝ PWA (PROGRESSIVE WEB APP) (Requirement 3.6)
 * - Đăng ký Service Worker (/sw.js)
 * - Bắt sự kiện beforeinstallprompt để kích hoạt cài đặt lên màn hình chính
 * - Hướng dẫn cài đặt trên iOS Safari (Add to Home Screen)
 * - Hiển thị banner & modal cài đặt tiện lợi
 */

import { showToast } from '../utils/helpers.js';

let deferredPrompt = null;
let isIosDevice = false;
let isStandalone = false;

export function isAppInstalled() {
  return isStandalone;
}

export function openPwaInstallModal() {
  const modal = document.getElementById('pwaInstallModal');
  const standardBlock = document.getElementById('pwaStandardInstallBlock');
  const iosBlock = document.getElementById('pwaIosInstallBlock');

  if (!modal) return;

  if (isIosDevice) {
    if (standardBlock) standardBlock.classList.add('hidden');
    if (iosBlock) iosBlock.classList.remove('hidden');
  } else {
    if (standardBlock) standardBlock.classList.remove('hidden');
    if (iosBlock) iosBlock.classList.add('hidden');
  }

  modal.classList.remove('modal-enter');
  modal.classList.add('modal-show');
}

export function hidePwaInstallModal() {
  const modal = document.getElementById('pwaInstallModal');
  if (modal) {
    modal.classList.remove('modal-show');
    modal.classList.add('modal-enter');
  }
}

export async function promptPwaInstall() {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('Đang cài đặt ứng dụng lên màn hình chính... 🎉', 'success');
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.classList.add('hidden');
      }
      deferredPrompt = null;
    } catch (e) {
      console.warn('Lỗi khi kích hoạt install prompt:', e);
    }
    hidePwaInstallModal();
    return;
  }

  if (isIosDevice) {
    openPwaInstallModal();
    return;
  }

  if (isStandalone) {
    showToast('Ứng dụng đã được cài đặt và đang chạy ở chế độ App! ✨', 'info');
    hidePwaInstallModal();
    return;
  }

  // Trên desktop/trình duyệt không có deferredPrompt sẵn
  showToast('Để cài đặt: Bấm vào biểu tượng Cài đặt (máy tính / mũi tên) trên thanh địa chỉ trình duyệt! 🖥️', 'info');
  hidePwaInstallModal();
}

export function initPwa() {
  // Kiểm tra chế độ standalone
  isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                 window.navigator.standalone === true;

  // Nhận diện iOS thiết bị (iPhone, iPad, iPod)
  const ua = window.navigator.userAgent.toLowerCase();
  isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;

  // 1. Đăng ký Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    });
  }

  // 2. Lắng nghe sự kiện beforeinstallprompt (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Hiển thị banner cài đặt trên mobile nếu chưa từng cài đặt và chưa đóng trong phiên
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    const banner = document.getElementById('pwaInstallBanner');
    if (banner && !dismissed && !isStandalone) {
      banner.classList.remove('hidden');
    }
  });

  // 3. Khi ứng dụng đã cài đặt thành công
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showToast('Chúc mừng! Ứng dụng đã được cài đặt thành công lên màn hình chính! 🎉', 'success');
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.add('hidden');
    hidePwaInstallModal();
  });

  // 4. Gắn sự kiện các nút cài đặt
  const pwaInstallMenuBtn = document.getElementById('pwaInstallMenuBtn');
  const pwaDoInstallBtn = document.getElementById('pwaDoInstallBtn');
  const closePwaModalBtn = document.getElementById('closePwaModalBtn');
  const pwaDismissModalBtn = document.getElementById('pwaDismissModalBtn');
  const pwaInstallModal = document.getElementById('pwaInstallModal');

  const pwaBannerInstallBtn = document.getElementById('pwaBannerInstallBtn');
  const pwaBannerDismissBtn = document.getElementById('pwaBannerDismissBtn');
  const pwaInstallBanner = document.getElementById('pwaInstallBanner');

  if (pwaInstallMenuBtn) {
    pwaInstallMenuBtn.addEventListener('click', () => {
      const headerMoreMenu = document.getElementById('headerMoreMenu');
      if (headerMoreMenu) headerMoreMenu.classList.add('hidden');
      openPwaInstallModal();
    });
  }

  if (pwaDoInstallBtn) {
    pwaDoInstallBtn.addEventListener('click', promptPwaInstall);
  }

  if (closePwaModalBtn) {
    closePwaModalBtn.addEventListener('click', hidePwaInstallModal);
  }

  if (pwaDismissModalBtn) {
    pwaDismissModalBtn.addEventListener('click', hidePwaInstallModal);
  }

  if (pwaInstallModal) {
    pwaInstallModal.addEventListener('click', (e) => {
      if (e.target === pwaInstallModal) hidePwaInstallModal();
    });
  }

  if (pwaBannerInstallBtn) {
    pwaBannerInstallBtn.addEventListener('click', () => {
      promptPwaInstall();
    });
  }

  if (pwaBannerDismissBtn) {
    pwaBannerDismissBtn.addEventListener('click', () => {
      if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
      sessionStorage.setItem('pwa_banner_dismissed', '1');
    });
  }
}
