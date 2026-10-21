import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove, onValue, push } from 'firebase/database';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { 
  FIREBASE_CONFIG_KEY, 
  CACHED_API_CONFIG_KEY, 
  DEFAULT_FIREBASE_CONFIG, 
  ADMIN_EMAIL_HASH_KEY,
  ADMIN_EMAIL_KEY,
  RECAPTCHA_KEY
} from '../utils/constants.js';
import { parseFirebaseConfig, saveDishesLocally, normalizeDish, hashString } from './storage.js';
import { showToast } from '../utils/helpers.js';

let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let appCheck = null;
let isFirebaseConnected = false;
let currentUser = null;
let adminEmailHash = localStorage.getItem(ADMIN_EMAIL_HASH_KEY) || "";
let isAdminUser = false;

// Dọn dẹp key cũ lưu email dạng thô để đảm bảo an toàn tuyệt đối
try {
  localStorage.removeItem(ADMIN_EMAIL_KEY);
} catch (_) {}

export function getFirebaseDb() {
  return firebaseDb;
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getIsFirebaseConnected() {
  return isFirebaseConnected;
}

export function getCurrentUser() {
  return currentUser;
}

export function getAdminEmailHash() {
  return adminEmailHash;
}

export function setAdminEmailHash(hash) {
  adminEmailHash = hash ? String(hash).trim().toLowerCase() : "";
  if (adminEmailHash) {
    localStorage.setItem(ADMIN_EMAIL_HASH_KEY, adminEmailHash);
  }
  checkCurrentUserAdmin();
}

export async function checkCurrentUserAdmin() {
  if (!currentUser || currentUser.isAnonymous || !currentUser.email || !adminEmailHash) {
    isAdminUser = false;
    return false;
  }
  try {
    const userHash = await hashString(currentUser.email);
    isAdminUser = (userHash === adminEmailHash);
  } catch (_) {
    isAdminUser = false;
  }
  return isAdminUser;
}

export function isCurrentUserAdmin() {
  return isAdminUser;
}

/**
 * Khởi tạo Firebase: Database + Anonymous Auth + Google Auth + App Check
 */
export async function initFirebase({
  onDishesSync,
  onDataChange,
  onAdminPinSync,
  onAuthChange,
  onStatusChange,
  getDishes,
  setDishes,
  getCurrentPinHash,
  setCurrentPinHash
} = {}) {
  let configObj = null;
  const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);

  // Xóa cờ DISABLED cũ nếu có để luôn ưu tiên tự động kết nối Cloud
  if (savedConfig === 'DISABLED') {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
  }

  if (savedConfig && savedConfig !== 'DISABLED') {
    configObj = parseFirebaseConfig(savedConfig);
  }

  // 1. Kiểm tra cache cấu hình từ lần trước để kết nối tức thì (0ms)
  const cachedApiConfig = localStorage.getItem(CACHED_API_CONFIG_KEY);
  if (cachedApiConfig) {
    try {
      const parsed = JSON.parse(cachedApiConfig);
      if (parsed && parsed.databaseURL && parsed.apiKey) {
        configObj = parsed;
        if (parsed.adminEmailHash) setAdminEmailHash(parsed.adminEmailHash);
      }
    } catch (e) { }
  }

  // 2. Nếu chưa có config (hoặc lần đầu vào web), tự động tải từ /api/config (đọc từ .env)
  if (!configObj) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const apiConfig = await res.json();
        if (apiConfig && apiConfig.databaseURL && apiConfig.apiKey) {
          configObj = apiConfig;
          localStorage.setItem(CACHED_API_CONFIG_KEY, JSON.stringify(apiConfig));
          if (apiConfig.adminEmailHash) setAdminEmailHash(apiConfig.adminEmailHash);
        }
      }
    } catch (err) {
      console.warn("Không thể tải cấu hình Firebase từ /api/config:", err.message);
    }
  } else {
    // Đã có cache: vẫn tải ngầm để cập nhật adminEmailHash hoặc env mới nhất
    fetch('/api/config')
      .then((res) => res.ok && res.json())
      .then((apiConfig) => {
        if (apiConfig) {
          if (apiConfig.adminEmailHash) setAdminEmailHash(apiConfig.adminEmailHash);
          localStorage.setItem(CACHED_API_CONFIG_KEY, JSON.stringify(apiConfig));
        }
      })
      .catch(() => {});
  }

  if (onStatusChange) onStatusChange('connecting', 'Đang kết nối Firebase Cloud...');

  // Nếu không thể kết nối tới Firebase, tự động fallback sang LocalStorage
  if (!configObj || !configObj.databaseURL) {
    if (onStatusChange) onStatusChange('local', 'Không thể kết nối Firebase, đang dùng LocalStorage');
    return;
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(configObj);
    } else {
      firebaseApp = getApp();
    }
    firebaseDb = getDatabase(firebaseApp, configObj.databaseURL);
    firebaseAuth = getAuth(firebaseApp);

    // Tải trước danh sách món ăn từ REST API để load tức thì 100% không bị treo
    try {
      const restEndpoint = `${configObj.databaseURL.replace(/\/$/, '')}/shared_dishes.json`;
      const restRes = await fetch(restEndpoint);
      if (restRes.ok) {
        const restJson = await restRes.json();
        if (restJson) {
          let preloaded = Array.isArray(restJson) ? restJson.filter(Boolean) : Object.values(restJson);
          preloaded = preloaded.map(normalizeDish);
          if (preloaded.length > 0) {
            if (typeof setDishes === 'function') setDishes(preloaded);
            if (typeof onDishesSync === 'function') onDishesSync(preloaded);
            if (typeof onDataChange === 'function') onDataChange(preloaded);
            saveDishesLocally(preloaded);
            isFirebaseConnected = true;
            if (onStatusChange) onStatusChange('connected', 'Firebase Realtime Đang Hoạt Động 🔥');
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi tải REST ban đầu:", e.message);
    }

    // 1. Cấu hình App Check (reCAPTCHA v3 hoặc reCAPTCHA Enterprise) nếu có Site Key
    const siteKey = configObj.recaptchaSiteKey || localStorage.getItem(RECAPTCHA_KEY);
    if (!appCheck && siteKey && typeof window !== 'undefined') {
      try {
        // Hỗ trợ chế độ debug khi chạy ở localhost để không bị chặn token
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        const isEnterprise = configObj.recaptchaType === 'enterprise';
        const provider = isEnterprise
          ? new ReCaptchaEnterpriseProvider(siteKey)
          : new ReCaptchaV3Provider(siteKey);

        appCheck = initializeAppCheck(firebaseApp, {
          provider,
          isTokenAutoRefreshEnabled: true
        });
        console.log(`Firebase App Check đã kích hoạt (${isEnterprise ? 'reCAPTCHA Enterprise' : 'reCAPTCHA v3'})!`);
      } catch (err) {
        console.warn("Lỗi khởi tạo App Check:", err.message);
      }
    }

    // 2. Lắng nghe trạng thái đăng nhập Auth
    onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        currentUser = user;
      } else {
        // Tự động đăng nhập Anonymous Auth nếu chưa có user
        try {
          const cred = await signInAnonymously(firebaseAuth);
          currentUser = cred.user;
        } catch (authErr) {
          console.warn("Lỗi Anonymous Auth:", authErr.message);
        }
      }
      await checkCurrentUserAdmin();
      if (onAuthChange) {
        onAuthChange({ user: currentUser, isAdmin: isAdminUser });
      }
    });

    // 3. Theo dõi trạng thái kết nối mạng thực tế
    const connectedRef = ref(firebaseDb, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        isFirebaseConnected = true;
        if (onStatusChange) onStatusChange('connected', 'Firebase Realtime Đang Hoạt Động 🔥');
      } else {
        if (isFirebaseConnected) {
          isFirebaseConnected = false;
          if (onStatusChange) onStatusChange('offline', 'Mất kết nối Cloud, chuyển sang dữ liệu máy');
        }
      }
    });

    // 4. Lắng nghe dữ liệu danh sách món ăn
    const dishesRef = ref(firebaseDb, "shared_dishes");

    let hasInitialData = false;
    const connectionTimeout = setTimeout(() => {
      if (!hasInitialData) {
        console.warn("Firebase phản hồi chậm, tiếp tục dùng LocalStorage.");
        if (onStatusChange) onStatusChange('local', 'Kết nối chậm, đang dùng LocalStorage');
      }
    }, 5000);

    onValue(dishesRef, (snapshot) => {
      hasInitialData = true;
      clearTimeout(connectionTimeout);
      const cloudData = snapshot.val();

      if (cloudData) {
        // Chuẩn hóa dữ liệu tương thích ngược (nếu là object index thì đổi sang array)
        let loadedDishes = [];
        if (Array.isArray(cloudData)) {
          loadedDishes = cloudData.filter(Boolean);
        } else if (typeof cloudData === 'object') {
          loadedDishes = Object.values(cloudData);
        }

        // Tương thích ngược & Soft migration (Requirement 3.1)
        loadedDishes = loadedDishes.map(normalizeDish);

        if (loadedDishes.length > 0) {
          if (typeof setDishes === 'function') setDishes(loadedDishes);
          if (typeof onDishesSync === 'function') onDishesSync(loadedDishes);
          if (typeof onDataChange === 'function') onDataChange(loadedDishes);
          saveDishesLocally(loadedDishes);
        }
      } else {
        // Cloud chưa có dữ liệu: chỉ tự động đẩy dữ liệu mẫu lên nếu là Admin đã đăng nhập
        if (isAdminUser) {
          const current = (typeof getDishes === 'function') ? getDishes() : [];
          if (current && current.length > 0) {
            saveDishesCloud(current);
          }
        }
      }
      isFirebaseConnected = true;
      if (onStatusChange) onStatusChange('connected', 'Firebase Realtime Đang Hoạt Động 🔥');
    }, (error) => {
      clearTimeout(connectionTimeout);
      isFirebaseConnected = false;
      console.error("Firebase Realtime Error:", error);
      if (onStatusChange) onStatusChange('local', 'Lỗi Cloud (' + (error.code || 'không thể kết nối') + '), đang dùng LocalStorage');
    });

  } catch (e) {
    console.error("Lỗi khởi tạo Firebase SDK:", e);
    isFirebaseConnected = false;
    if (onStatusChange) onStatusChange('local', 'Lỗi SDK, đang dùng LocalStorage');
  }
}

/**
 * Đăng nhập Admin qua Google Sign-In
 */
export async function signInAdminGoogle() {
  if (!firebaseAuth) {
    showToast("Firebase Auth chưa được khởi tạo!", "error");
    return null;
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(firebaseAuth, provider);
    currentUser = result.user;
    await checkCurrentUserAdmin();

    if (isAdminUser) {
      showToast("Đăng nhập Quản trị viên thành công! 👑", "success");
    } else {
      showToast("Tài khoản Google này không có quyền Quản trị viên.", "warning");
    }
    return { user: currentUser, isAdmin: isAdminUser };
  } catch (err) {
    console.error("Lỗi Google Sign-In:", err);
    showToast("Không thể đăng nhập Google: " + (err.message || 'Hủy bỏ'), "error");
    return null;
  }
}

/**
 * Đăng xuất Admin (chuyển lại về Anonymous Auth)
 */
export async function signOutAdminGoogle() {
  if (!firebaseAuth) return;
  try {
    await signOut(firebaseAuth);
    isAdminUser = false;
    // Tự động chuyển về tài khoản ẩn danh
    const cred = await signInAnonymously(firebaseAuth);
    currentUser = cred.user;
    showToast("Đã đăng xuất tài khoản Google", "info");
    return { user: currentUser, isAdmin: false };
  } catch (err) {
    console.error("Lỗi đăng xuất:", err);
  }
}

/**
 * Thêm một món ăn mới lên Cloud (Khách hoặc Admin đều được phép theo rule $dishId: !data.exists())
 */
export async function addDishCloud(dish) {
  if (isFirebaseConnected && firebaseDb && dish && dish.id) {
    try {
      const dishRef = ref(firebaseDb, `shared_dishes/${dish.id}`);
      await set(dishRef, dish);
      return true;
    } catch (err) {
      console.warn("Lỗi thêm món lên Cloud:", err);
      return false;
    }
  }
  return false;
}

/**
 * Xóa một món ăn trên Cloud (Chỉ Admin mới có quyền theo rule $dishId)
 */
export async function deleteDishCloud(dishId) {
  if (isFirebaseConnected && firebaseDb && dishId) {
    try {
      const dishRef = ref(firebaseDb, `shared_dishes/${dishId}`);
      await remove(dishRef);
      return true;
    } catch (err) {
      console.error("Lỗi xóa món trên Cloud:", err);
      showToast("Chỉ Quản trị viên mới có quyền xóa món khỏi hệ thống!", "error");
      return false;
    }
  }
  return false;
}

/**
 * Đẩy toàn bộ dữ liệu món ăn lên Cloud (Dành riêng cho Admin khôi phục thực đơn gốc)
 */
export function saveDishesCloud(dishes) {
  if (isFirebaseConnected && firebaseDb) {
    try {
      // Lưu dưới dạng object { [id]: dish } để khớp hoàn hảo với cấu trúc $dishId trong Firebase
      let dishesData = dishes;
      if (Array.isArray(dishes)) {
        dishesData = {};
        dishes.forEach((d) => {
          if (d && d.id) {
            dishesData[d.id] = d;
          }
        });
      }

      const dishesRef = ref(firebaseDb, "shared_dishes");
      return set(dishesRef, dishesData).catch(err => {
        console.error("Lỗi đẩy lên Firebase:", err);
        const errMsg = err?.message || '';
        if (errMsg.includes('PERMISSION_DENIED') || err?.code === 'PERMISSION_DENIED') {
          showToast("Firebase từ chối quyền ghi: Hãy đăng nhập tài khoản Google Admin trước khi khôi phục thực đơn!", "error");
        } else {
          showToast("Lỗi kết nối Cloud, dữ liệu đã được lưu an toàn trên máy bạn", "warning");
        }
        throw err;
      });
    } catch (e) {
      console.error("Lỗi gọi Firebase set:", e);
    }
  }
  return Promise.resolve();
}

/**
 * Gửi báo cáo vi phạm lên Firebase Cloud (/reports)
 */
export async function submitReportCloud({ targetType, targetId, targetName, reason }) {
  if (!targetId || !reason) return false;
  const reportData = {
    targetType: targetType || 'dish', // 'dish' | 'review'
    targetId: String(targetId),
    targetName: targetName || '',
    reason: String(reason).slice(0, 300),
    reporterUid: currentUser?.uid || 'anonymous',
    createdAt: Date.now()
  };

  // Lưu cục bộ trước
  try {
    const localReportsKey = 'hom_nay_an_gi_local_reports';
    const existing = JSON.parse(localStorage.getItem(localReportsKey) || '[]');
    existing.unshift(reportData);
    localStorage.setItem(localReportsKey, JSON.stringify(existing.slice(0, 50)));
  } catch (e) { }

  if (isFirebaseConnected && firebaseDb) {
    try {
      const reportsRef = ref(firebaseDb, "reports");
      const newReportRef = push(reportsRef);
      await set(newReportRef, reportData);
      return true;
    } catch (err) {
      console.warn("Lỗi gửi báo cáo lên Cloud:", err);
      return true; // Vẫn tính là thành công vì đã lưu cục bộ
    }
  }
  return true;
}

/**
 * Lấy danh sách báo cáo vi phạm (Dành cho Admin)
 */
export async function getReportsCloud() {
  if (isFirebaseConnected && firebaseDb) {
    try {
      const snapshot = await get(ref(firebaseDb, "reports"));
      if (snapshot.exists()) {
        const val = snapshot.val();
        return Object.entries(val).map(([id, data]) => ({ id, ...data }));
      }
    } catch (err) {
      console.warn("Lỗi đọc reports từ Cloud:", err);
    }
  }
  try {
    return JSON.parse(localStorage.getItem('hom_nay_an_gi_local_reports') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Xóa một báo cáo đã xử lý (Dành cho Admin)
 */
export async function resolveReportCloud(reportId) {
  if (isFirebaseConnected && firebaseDb && reportId) {
    try {
      await remove(ref(firebaseDb, `reports/${reportId}`));
    } catch (err) {
      console.warn("Lỗi xóa report:", err);
    }
  }
  try {
    const localReportsKey = 'hom_nay_an_gi_local_reports';
    const existing = JSON.parse(localStorage.getItem(localReportsKey) || '[]');
    const filtered = existing.filter(r => r.id !== reportId);
    localStorage.setItem(localReportsKey, JSON.stringify(filtered));
  } catch (e) { }
}

/**
 * Đồng bộ mã PIN mới lên Cloud
 */
export function syncAdminPinToCloud(newHash) {
  if (isFirebaseConnected && firebaseDb) {
    try {
      set(ref(firebaseDb, "admin_config/pinHash"), newHash).catch(err => {
        console.warn("Lỗi đồng bộ mã PIN lên Cloud:", err);
      });
    } catch (e) { }
  }
}
