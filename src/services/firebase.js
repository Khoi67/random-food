import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { 
  FIREBASE_CONFIG_KEY, 
  CACHED_API_CONFIG_KEY, 
  DEFAULT_FIREBASE_CONFIG, 
  ADMIN_PIN_HASH_KEY 
} from '../utils/constants.js';
import { parseFirebaseConfig, saveDishesLocally } from './storage.js';
import { showToast } from '../utils/helpers.js';

let firebaseDb = null;
let isFirebaseConnected = false;

export function getFirebaseDb() {
  return firebaseDb;
}

export function getIsFirebaseConnected() {
  return isFirebaseConnected;
}

export function setIsFirebaseConnected(val) {
  isFirebaseConnected = !!val;
}

/**
 * Khởi tạo Firebase nếu có cấu hình (ưu tiên Firebase Realtime Database)
 */
export async function initFirebase({
  onDishesSync,
  onAdminPinSync,
  onStatusChange,
  getDishes,
  setDishes,
  getCurrentPinHash,
  setCurrentPinHash
}) {
  let configObj = null;
  const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);

  // Nếu người dùng chủ động tắt Cloud
  if (savedConfig === 'DISABLED') {
    onStatusChange('local', 'Đang dùng LocalStorage (Đã tắt Cloud)');
    return;
  }

  onStatusChange('connecting', 'Đang kết nối Firebase Cloud...');

  if (savedConfig) {
    configObj = parseFirebaseConfig(savedConfig);
  } else {
    // Kiểm tra cache local trước để tránh gọi API Serverless Vercel liên tục
    const cachedApiConfig = localStorage.getItem(CACHED_API_CONFIG_KEY);
    if (cachedApiConfig) {
      try {
        const parsed = JSON.parse(cachedApiConfig);
        if (parsed && parsed.databaseURL && parsed.apiKey) {
          configObj = parsed;
        }
      } catch (e) { }
    }

    if (!configObj) {
      // Lấy cấu hình từ Vercel Environment Variables nếu có
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
          }
        }
      } catch (err) {
        console.warn("Không thể tải /api/config:", err.message);
      }
    }

    if (!configObj && typeof DEFAULT_FIREBASE_CONFIG === 'object' && DEFAULT_FIREBASE_CONFIG?.databaseURL) {
      configObj = DEFAULT_FIREBASE_CONFIG;
    }
  }

  // Nếu không có bất kỳ cấu hình Firebase nào
  if (!configObj || !configObj.databaseURL) {
    onStatusChange('local', 'Chưa có cấu hình Firebase, dùng LocalStorage');
    return;
  }

  try {
    const app = initializeApp(configObj, "foodWheelApp_" + Date.now());
    firebaseDb = getDatabase(app);

    // Theo dõi trạng thái kết nối mạng thực tế
    const connectedRef = ref(firebaseDb, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        isFirebaseConnected = true;
        onStatusChange('connected', 'Firebase Realtime Đang Hoạt Động 🔥');
      } else {
        if (isFirebaseConnected) {
          isFirebaseConnected = false;
          onStatusChange('offline', 'Mất kết nối Cloud, chuyển sang dữ liệu máy');
        }
      }
    });

    const dishesRef = ref(firebaseDb, "shared_dishes");

    let hasInitialData = false;
    const connectionTimeout = setTimeout(() => {
      if (!hasInitialData) {
        console.warn("Firebase phản hồi chậm, tiếp tục dùng LocalStorage.");
        onStatusChange('local', 'Kết nối chậm, đang dùng LocalStorage');
      }
    }, 5000);

    // Lắng nghe dữ liệu realtime
    onValue(dishesRef, (snapshot) => {
      hasInitialData = true;
      clearTimeout(connectionTimeout);
      const cloudData = snapshot.val();

      if (Array.isArray(cloudData) && cloudData.length > 0) {
        setDishes(cloudData);
        saveDishesLocally(cloudData);
        if (onDishesSync) onDishesSync(cloudData);
      } else {
        // Cloud rỗng: đồng bộ danh sách hiện có lên Cloud
        const current = getDishes();
        saveDishesCloud(current);
      }
      isFirebaseConnected = true;
      onStatusChange('connected', 'Đã đồng bộ Firebase Realtime');
    }, (error) => {
      clearTimeout(connectionTimeout);
      isFirebaseConnected = false;
      console.error("Firebase Realtime Error:", error);
      onStatusChange('local', 'Lỗi Cloud (' + (error.code || 'quá tải') + '), đang dùng LocalStorage');
      showToast("Cloud gặp sự cố: " + (error.message || 'Quá tải') + ". Tự động dùng LocalStorage", "warning");
    });

    // Đồng bộ mã PIN Admin (đã mã hóa SHA-256) từ Firebase
    const adminPinRef = ref(firebaseDb, "admin_config/pinHash");
    onValue(adminPinRef, (snapshot) => {
      const cloudPinHash = snapshot.val();
      if (cloudPinHash && typeof cloudPinHash === 'string' && cloudPinHash.length >= 16) {
        setCurrentPinHash(cloudPinHash);
        localStorage.setItem(ADMIN_PIN_HASH_KEY, cloudPinHash);
        if (onAdminPinSync) onAdminPinSync(cloudPinHash);
      }
    }, (err) => {
      console.warn("Không thể đồng bộ mã PIN từ Cloud:", err);
    });

  } catch (e) {
    console.error("Lỗi khởi tạo Firebase SDK:", e);
    isFirebaseConnected = false;
    onStatusChange('local', 'Lỗi SDK, đang dùng LocalStorage');
  }
}

/**
 * Đẩy dữ liệu món ăn lên Firebase Realtime Database
 */
export function saveDishesCloud(dishes) {
  if (isFirebaseConnected && firebaseDb) {
    try {
      const dishesRef = ref(firebaseDb, "shared_dishes");
      set(dishesRef, dishes).catch(err => {
        console.error("Lỗi đẩy lên Firebase:", err);
        const errMsg = err?.message || '';
        if (errMsg.includes('PERMISSION_DENIED') || err?.code === 'PERMISSION_DENIED') {
          showToast("Firebase từ chối quyền ghi (Permission Denied). Hãy cập nhật Rules trên Firebase Console!", "error");
        } else {
          showToast("Lỗi kết nối Cloud, dữ liệu đã được lưu an toàn trên máy bạn", "warning");
        }
      });
    } catch (e) {
      console.error("Lỗi gọi Firebase set:", e);
    }
  }
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
