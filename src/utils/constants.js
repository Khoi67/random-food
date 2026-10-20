export const STORAGE_KEY = 'hom_nay_an_gi_dishes_hcm_v2';
export const FIREBASE_CONFIG_KEY = 'hom_nay_an_gi_firebase_config_v1';
export const CACHED_API_CONFIG_KEY = 'hom_nay_an_gi_api_config_cache_v1';
export const OLD_ADMIN_PIN_KEY = 'hom_nay_an_gi_admin_pin_v1';
export const ADMIN_PIN_HASH_KEY = 'hom_nay_an_gi_admin_pin_hash_v2';
// Mã băm SHA-256 mặc định cho PIN '123456'
export const DEFAULT_ADMIN_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

// Giới hạn chống spam
export const ADD_DISH_COOLDOWN_MS = 10000; // 10 giây giãn cách giữa các lần thêm món
export const MAX_SHARED_DISHES = 80;       // Tối đa 80 món trong danh sách dùng chung
export const REVIEW_COOLDOWN_MS = 15000;   // 15 giây giữa các lần gửi đánh giá
export const MAX_REVIEWS_PER_DISH = 15;    // Tối đa 15 đánh giá mỗi quán

export const DEFAULT_FIREBASE_CONFIG = null;

// Bảng màu cho các lát cắt của vòng quay
export const SLICE_COLORS = [
  '#f97316', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#d946ef'  // Fuchsia
];
