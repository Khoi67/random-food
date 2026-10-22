import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove, onValue, push, serverTimestamp } from 'firebase/database';
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
  if (!currentUser && firebaseAuth && firebaseAuth.currentUser) {
    currentUser = firebaseAuth.currentUser;
  }
  return currentUser;
}

export async function ensureAuth() {
  if (currentUser) return currentUser;
  if (firebaseAuth) {
    if (firebaseAuth.currentUser) {
      currentUser = firebaseAuth.currentUser;
      return currentUser;
    }
    try {
      const cred = await signInAnonymously(firebaseAuth);
      currentUser = cred.user;
      return currentUser;
    } catch (e) {
      console.warn("Lỗi xác thực ẩn danh:", e);
    }
  }
  return null;
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
 * Ghi nhận mốc thời gian thao tác để kiểm soát tần suất (Rate Limit chống spam)
 */
export async function recordRateLimitCloud(type) {
  if (!isFirebaseConnected || !firebaseDb) return;
  const user = await ensureAuth();
  if (!user || !user.uid) return;
  try {
    const field = type === 'dish' ? 'lastDishAt' : 'lastReviewAt';
    const limitRef = ref(firebaseDb, `rate_limits/${user.uid}/${field}`);
    await set(limitRef, Date.now()).catch(() => {});
  } catch (_) {}
}

/**
 * Thêm một món ăn mới lên Cloud (Pending đưa vào node pending_dishes bảo vệ)
 */
export async function addDishCloud(dish) {
  if (!dish || !dish.id) return false;

  // Đảm bảo có tài khoản (Anonymous hoặc Google) trước khi ghi
  const user = await ensureAuth();

  if (isFirebaseConnected && firebaseDb) {
    try {
      const payload = {
        ...dish,
        createdBy: dish.createdBy && dish.createdBy !== 'anonymous' ? dish.createdBy : (user?.uid || 'anonymous')
      };
      // Loại bỏ toàn bộ các trường undefined
      const cleanDish = JSON.parse(JSON.stringify(payload));
      
      // Món pending được lưu vào node pending_dishes để khách không đọc trộm được qua mạng
      const targetNode = cleanDish.status === 'pending' ? 'pending_dishes' : 'shared_dishes';
      
      // Multi-path atomic update: Ghi món kèm rate limit lastDishAt cùng lúc
      const updates = {};
      updates[`${targetNode}/${dish.id}`] = cleanDish;
      if (user?.uid && user.uid !== 'anonymous') {
        updates[`rate_limits/${user.uid}/lastDishAt`] = serverTimestamp();
      }

      await update(ref(firebaseDb), updates);
      recordRateLimitCloud('dish');
      return true;
    } catch (err) {
      console.warn("Lỗi thêm món lên Cloud:", err);
      if (err?.code === 'PERMISSION_DENIED' || String(err?.message || err).includes('Permission denied')) {
        showToast("Bạn thao tác hơi nhanh hoặc chưa được cấp quyền, vui lòng thử lại sau ít phút!", "warning");
      }
      return false;
    }
  }
  return false;
}

/**
 * Xóa một món ăn trên Cloud (Chỉ Admin mới có quyền)
 */
export async function deleteDishCloud(dishId) {
  if (isFirebaseConnected && firebaseDb && dishId) {
    try {
      const sharedRef = ref(firebaseDb, `shared_dishes/${dishId}`);
      await remove(sharedRef).catch(() => {});
      const pendingRef = ref(firebaseDb, `pending_dishes/${dishId}`);
      await remove(pendingRef).catch(() => {});
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
 * Phê duyệt món ăn từ pending_dishes sang shared_dishes
 */
export async function approveDishCloud(dish) {
  if (isFirebaseConnected && firebaseDb && dish && dish.id) {
    try {
      const cleanDish = JSON.parse(JSON.stringify({ ...dish, status: 'approved' }));
      const sharedRef = ref(firebaseDb, `shared_dishes/${dish.id}`);
      await set(sharedRef, cleanDish);
      const pendingRef = ref(firebaseDb, `pending_dishes/${dish.id}`);
      await remove(pendingRef).catch(() => {});
      return true;
    } catch (err) {
      console.error("Lỗi duyệt món trên Cloud:", err);
      showToast("Chỉ Quản trị viên mới có quyền duyệt món!", "error");
      return false;
    }
  }
  return false;
}

/**
 * Cập nhật trạng thái món ăn trên Cloud (Dành riêng cho Admin duyệt món)
 */
export async function updateDishStatusCloud(dishId, status) {
  if (isFirebaseConnected && firebaseDb && dishId && status) {
    try {
      if (status === 'approved') {
        const pendingRef = ref(firebaseDb, `pending_dishes/${dishId}`);
        const snap = await get(pendingRef);
        if (snap.exists()) {
          const dishData = snap.val();
          return await approveDishCloud(dishData);
        }
      }
      const statusRef = ref(firebaseDb, `shared_dishes/${dishId}/status`);
      await set(statusRef, status);
      return true;
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái món trên Cloud:", err);
      showToast("Chỉ Quản trị viên mới có quyền duyệt món!", "error");
      return false;
    }
  }
  return false;
}

/**
 * Đăng ký lắng nghe danh sách món chờ duyệt (Chỉ Admin mới có quyền đọc)
 */
export function subscribePendingDishesCloud(onPendingChange) {
  if (isFirebaseConnected && firebaseDb) {
    const pendingRef = ref(firebaseDb, "pending_dishes");
    return onValue(pendingRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.values(val) : [];
      if (typeof onPendingChange === 'function') {
        onPendingChange(list);
      }
    }, (err) => {
      // Bị chặn Permission Denied nếu tài khoản không phải Admin (Bảo mật đúng thiết kế)
      console.warn("Lắng nghe pending_dishes bị chặn (Chỉ Admin mới có quyền):", err.code);
    });
  }
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
  const user = await ensureAuth();
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const reportData = {
    targetType: targetType || 'dish', // 'dish' | 'review'
    targetId: String(targetId).slice(0, 100),
    targetName: String(targetName || '').slice(0, 100),
    reason: String(reason).slice(0, 300),
    reporterUid: user?.uid || 'anonymous',
    createdAt: Date.now()
  };

  // Lưu cục bộ trước (Local-first)
  try {
    const localReportsKey = 'hom_nay_an_gi_local_reports';
    const existing = JSON.parse(localStorage.getItem(localReportsKey) || '[]');
    existing.unshift({ id: reportId, ...reportData });
    localStorage.setItem(localReportsKey, JSON.stringify(existing.slice(0, 50)));
  } catch (e) { }

  if (isFirebaseConnected && firebaseDb) {
    try {
      // Multi-path atomic update: Ghi report kèm rate limit lastReportAt cùng lúc
      const updates = {};
      updates[`reports/${reportId}`] = reportData;
      if (user?.uid && user.uid !== 'anonymous') {
        updates[`rate_limits/${user.uid}/lastReportAt`] = serverTimestamp();
      }
      await update(ref(firebaseDb), updates);
      return true;
    } catch (err) {
      console.warn("Lỗi gửi báo cáo lên Cloud:", err);
      if (err?.code === 'PERMISSION_DENIED' || String(err?.message || err).includes('Permission denied')) {
        showToast("Bạn gửi báo cáo hơi nhanh, vui lòng thử lại sau ít phút!", "warning");
      }
      return true; // Vẫn tính là thành công vì đã lưu cục bộ an toàn
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

/**
 * Cập nhật món ăn trên Cloud (Chỉ ghi vào node con shared_dishes/${id})
 */
export async function updateDishCloud(dish) {
  if (!dish || !dish.id) return false;
  if (isFirebaseConnected && firebaseDb) {
    try {
      const cleanDish = JSON.parse(JSON.stringify({ ...dish, updatedAt: Date.now() }));
      const dishRef = ref(firebaseDb, `shared_dishes/${dish.id}`);
      await set(dishRef, cleanDish);
      return true;
    } catch (err) {
      console.error("Lỗi cập nhật món trên Cloud:", err);
      showToast("Chỉ Quản trị viên mới có quyền cập nhật món!", "error");
      return false;
    }
  }
  return false;
}

/**
 * Gửi đánh giá món ăn hoặc quán ăn lên Firebase Cloud (Hỗ trợ review theo quán)
 */
export async function addReviewCloud(dishId, locationIndexOrId, review) {
  if (!dishId || !review) return false;
  const user = await ensureAuth();
  if (isFirebaseConnected && firebaseDb) {
    try {
      const cleanReview = {
        author: String(review.author || 'Thực khách Sài Gòn').slice(0, 50),
        stars: Number(review.stars) || 5,
        comment: String(review.comment || '').slice(0, 300),
        createdAt: Number(review.createdAt) || Date.now()
      };

      const reviewUid = user?.uid || review.id || `anon_${Date.now()}`;
      
      // Multi-path atomic update: Ghi review kèm rate limit lastReviewAt cùng lúc
      const updates = {};
      if (locationIndexOrId != null) {
        // Ghi vào node location_reviews theo từng quán
        const locId = String(locationIndexOrId);
        updates[`location_reviews/${dishId}/${locId}/${reviewUid}`] = cleanReview;
      } else {
        // Ghi vào node reviews của món
        updates[`shared_dishes/${dishId}/reviews/${reviewUid}`] = cleanReview;
      }

      if (user?.uid && user.uid !== 'anonymous') {
        updates[`rate_limits/${user.uid}/lastReviewAt`] = serverTimestamp();
      }

      await update(ref(firebaseDb), updates);
      await recordRateLimitCloud('review');
      return true;
    } catch (err) {
      console.warn("Lỗi gửi review lên Cloud:", err);
      if (err?.code === 'PERMISSION_DENIED' || String(err?.message || err).includes('Permission denied')) {
        showToast("Bạn gửi đánh giá hơi nhanh, vui lòng thử lại sau giây lát nhé!", "warning");
      }
      return false;
    }
  }
  return false;
}

/**
 * Xóa review spam trên Cloud
 */
export async function deleteReviewCloud(dishId, locationIndex, reviewId) {
  if (!dishId || !reviewId) return false;
  if (isFirebaseConnected && firebaseDb) {
    try {
      // 1. Xóa trong location_reviews độc lập nếu có
      if (locationIndex != null) {
        await remove(ref(firebaseDb, `location_reviews/${dishId}/${locationIndex}/${reviewId}`)).catch(() => {});
      }
      // 2. Xóa trong shared_dishes
      if (locationIndex != null) {
        const locRef = ref(firebaseDb, `shared_dishes/${dishId}/locations/${locationIndex}`);
        const snap = await get(locRef);
        if (snap.exists()) {
          const locData = snap.val();
          const updatedReviews = (locData.reviews || []).filter((r) => r.id !== reviewId);
          await update(locRef, { reviews: updatedReviews });
          return true;
        }
      } else {
        const dishRef = ref(firebaseDb, `shared_dishes/${dishId}`);
        const snap = await get(dishRef);
        if (snap.exists()) {
          const dishData = snap.val();
          if (Array.isArray(dishData.reviews)) {
            const updatedReviews = dishData.reviews.filter((r) => r.id !== reviewId);
            await update(dishRef, { reviews: updatedReviews });
            return true;
          } else if (dishData.reviews && typeof dishData.reviews === 'object') {
            await remove(ref(firebaseDb, `shared_dishes/${dishId}/reviews/${reviewId}`));
            return true;
          }
        }
      }
    } catch (err) {
      console.error("Lỗi xóa review trên Cloud:", err);
      showToast("Lỗi xóa đánh giá trên Cloud: " + (err.message || ''), "error");
      return false;
    }
  }
  return false;
}

/**
 * Lắng nghe danh sách báo cáo vi phạm thời gian thực (Dành riêng cho Admin)
 */
export function subscribeReportsCloud(onReportsChange) {
  if (isFirebaseConnected && firebaseDb) {
    const reportsRef = ref(firebaseDb, "reports");
    return onValue(reportsRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val).map(([id, data]) => ({ id, ...data })) : [];
      if (typeof onReportsChange === 'function') {
        onReportsChange(list);
      }
    }, (err) => {
      console.warn("Lỗi lắng nghe reports:", err.code);
    });
  }
  return () => {};
}

/**
 * Ghi nhật ký thao tác quản trị viên vào node riêng admin_audit_logs (Local-first + Cloud)
 */
export async function logAdminActionCloud({ action, target, details }) {
  const logItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    adminUid: currentUser?.uid || 'admin',
    action: String(action || 'ACTION'),
    target: String(target || ''),
    details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : '',
    timestamp: Date.now()
  };

  // Local-First cache
  try {
    const localLogsKey = 'admin_audit_logs';
    const existing = JSON.parse(localStorage.getItem(localLogsKey) || '[]');
    existing.unshift(logItem);
    localStorage.setItem(localLogsKey, JSON.stringify(existing.slice(0, 100)));
  } catch (_) {}

  if (isFirebaseConnected && firebaseDb) {
    try {
      const logsRef = ref(firebaseDb, `admin_audit_logs/${logItem.id}`);
      await set(logsRef, logItem);
    } catch (err) {
      console.warn("Lỗi ghi nhật ký admin lên Cloud:", err);
    }
  }
  return logItem;
}

/**
 * Lắng nghe nhật ký quản trị viên thời gian thực
 */
export function subscribeAdminAuditLogsCloud(onLogsChange) {
  if (isFirebaseConnected && firebaseDb) {
    const logsRef = ref(firebaseDb, "admin_audit_logs");
    return onValue(logsRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.values(val).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];
      if (typeof onLogsChange === 'function') {
        onLogsChange(list);
      }
    }, (err) => {
      console.warn("Lỗi lắng nghe admin_audit_logs:", err.code);
    });
  }
  return () => {};
}

/**
 * Lắng nghe trạng thái cấu hình hệ thống thời gian thực (Kill Switch)
 */
export function subscribeConfigCloud(onConfigChange) {
  if (isFirebaseConnected && firebaseDb) {
    const configRef = ref(firebaseDb, "config");
    return onValue(configRef, (snap) => {
      const val = snap.val() || {};
      if (typeof onConfigChange === 'function') {
        onConfigChange(val);
      }
    }, (err) => {
      console.warn("Lỗi lắng nghe config:", err.code);
    });
  }
  return () => {};
}

/**
 * Bật/Tắt cờ ghi hệ thống writesEnabled (Kill Switch - Dành riêng cho Quản trị viên)
 */
export async function setWritesEnabledCloud(enabled) {
  if (!isFirebaseConnected || !firebaseDb) {
    showToast("Chưa kết nối Firebase Cloud", "error");
    return false;
  }
  try {
    const configRef = ref(firebaseDb, "config/writesEnabled");
    await set(configRef, Boolean(enabled));
    await logAdminActionCloud({
      action: enabled ? "ENABLE_SYSTEM_WRITES" : "DISABLE_SYSTEM_WRITES",
      target: "config/writesEnabled",
      details: enabled ? "Mở lại quyền ghi toàn hệ thống" : "Kích hoạt Kill Switch - Ngắt quyền ghi toàn hệ thống"
    });
    showToast(enabled ? "Đã mở lại quyền ghi toàn hệ thống" : "Đã kích hoạt Kill Switch (Khóa ghi hệ thống)", "info");
    return true;
  } catch (err) {
    console.error("Lỗi cập nhật Kill Switch:", err);
    showToast("Không thể cập nhật cờ Kill Switch: " + (err.message || ''), "error");
    return false;
  }
}

