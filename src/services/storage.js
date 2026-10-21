import { 
  STORAGE_KEY, 
  ADMIN_PIN_HASH_KEY 
} from '../utils/constants.js';
import { DEFAULT_DISHES_HCM } from '../data/defaultDishes.js';

/**
 * Mã hóa 1 chiều SHA-256 an toàn
 */
export async function hashPin(pin) {
  return hashString(pin);
}

export async function hashString(str) {
  if (!str) return '';
  const text = String(str).trim().toLowerCase();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
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
 * Lấy mã PIN đã lưu trong localStorage (hoặc null nếu chưa có)
 */
export async function initAdminPinSecurity() {
  localStorage.removeItem('hom_nay_an_gi_admin_pin_v1');
  return localStorage.getItem(ADMIN_PIN_HASH_KEY) || null;
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
 * Chuẩn hóa và tương thích ngược (Soft Migration) cho dữ liệu món ăn (Requirement 3.1)
 * Bổ sung priceRange, type, vegetarian, tags nếu món cũ chưa có.
 */
export function normalizeDish(dish) {
  if (!dish || typeof dish !== 'object') return dish;

  const nameLower = (dish.name || '').toLowerCase();

  // 1. Kiểu món: 'nuoc' hoặc 'kho'
  let type = dish.type;
  if (!type || (type !== 'nuoc' && type !== 'kho')) {
    const isSoup = nameLower.includes('bún') || 
                   nameLower.includes('phở') || 
                   nameLower.includes('hủ tiếu') || 
                   nameLower.includes('mì nước') || 
                   nameLower.includes('bánh canh') || 
                   nameLower.includes('cháo') || 
                   nameLower.includes('súp') || 
                   nameLower.includes('lẩu') ||
                   nameLower.includes('phá lấu');
    type = isSoup ? 'nuoc' : 'kho';
  }

  // 2. Chế độ ăn chay: boolean
  let vegetarian = dish.vegetarian;
  if (typeof vegetarian !== 'boolean') {
    vegetarian = nameLower.includes('chay') || nameLower.includes('chè');
  }

  // 3. Khoảng giá: 'under50', '50to100', 'above100'
  let priceRange = dish.priceRange;
  if (!priceRange || !['under50', '50to100', 'above100'].includes(priceRange)) {
    if (nameLower.includes('lẩu') || 
        nameLower.includes('nướng') || 
        nameLower.includes('dê') || 
        nameLower.includes('bò tơ') || 
        nameLower.includes('hải sản') || 
        nameLower.includes('dimsum') || 
        nameLower.includes('pizza') || 
        nameLower.includes('cơm niêu') || 
        nameLower.includes('haidilao')) {
      priceRange = 'above100';
    } else if (nameLower.includes('bánh mì') || 
               nameLower.includes('xôi') || 
               nameLower.includes('chè') || 
               nameLower.includes('bánh tráng') || 
               nameLower.includes('phá lấu') || 
               nameLower.includes('cơm gà')) {
      priceRange = 'under50';
    } else {
      priceRange = '50to100';
    }
  }

  // 4. Tags
  let tags = Array.isArray(dish.tags) ? dish.tags : [];
  if (tags.length === 0) {
    if (nameLower.includes('sài gòn') || nameLower.includes('hcm')) tags.push('đặc sản');
    if (type === 'nuoc') tags.push('món nước');
    if (type === 'kho') tags.push('món khô');
    if (vegetarian) tags.push('chay');
  }

  return {
    ...dish,
    status: dish.status || 'approved',
    type,
    vegetarian,
    priceRange,
    tags
  };
}

/**
 * Nạp món ăn từ LocalStorage (hoặc lấy mặc định nếu chưa có)
 */
export function loadDishesFromLocal() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeDish);
      }
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
    }
  }
  const defaults = DEFAULT_DISHES_HCM.map(normalizeDish);
  saveDishesLocally(defaults);
  return defaults;
}

/**
 * Lưu danh sách món ăn vào LocalStorage
 */
export function saveDishesLocally(dishes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}
