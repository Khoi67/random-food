import { 
  STORAGE_KEY, 
  ADMIN_PIN_HASH_KEY, 
  OLD_ADMIN_PIN_KEY, 
  DEFAULT_ADMIN_PIN_HASH 
} from '../utils/constants.js';
import { DEFAULT_DISHES_HCM } from '../data/defaultDishes.js';

/**
 * Mã hóa 1 chiều SHA-256 an toàn
 */
export async function hashPin(pin) {
  const text = String(pin).trim();
  if (window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Dự phòng trường hợp môi trường đặc biệt không có crypto.subtle
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

/**
 * Khởi tạo & migrate mã PIN Admin sang chuẩn băm SHA-256
 */
export async function initAdminPinSecurity() {
  const oldPlainPin = localStorage.getItem(OLD_ADMIN_PIN_KEY);
  if (oldPlainPin) {
    try {
      const hashed = await hashPin(oldPlainPin);
      localStorage.setItem(ADMIN_PIN_HASH_KEY, hashed);
      localStorage.removeItem(OLD_ADMIN_PIN_KEY);
      return hashed;
    } catch (e) {
      console.warn("Lỗi migrate mã PIN:", e);
    }
  }
  return localStorage.getItem(ADMIN_PIN_HASH_KEY) || DEFAULT_ADMIN_PIN_HASH;
}

/**
 * Parser cấu hình Firebase an toàn (chấp nhận cả JSON và Object JS copy từ Console)
 */
export function parseFirebaseConfig(rawText) {
  if (typeof rawText !== 'string') return null;
  try {
    return JSON.parse(rawText);
  } catch (e) { }

  const match = rawText.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const jsonText = match[0]
        .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
        .replace(/'/g, '"')
        .replace(/,\s*\}/g, '}');
      return JSON.parse(jsonText);
    } catch (e) {
      return (new Function("return " + match[0]))();
    }
  }
  return null;
}

/**
 * Nạp món ăn từ LocalStorage (hoặc lấy mặc định nếu chưa có)
 */
export function loadDishesFromLocal() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
    }
  }
  const defaults = JSON.parse(JSON.stringify(DEFAULT_DISHES_HCM));
  saveDishesLocally(defaults);
  return defaults;
}

/**
 * Lưu danh sách món ăn vào LocalStorage
 */
export function saveDishesLocally(dishes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}
