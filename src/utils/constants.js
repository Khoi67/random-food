export const STORAGE_KEY = 'hom_nay_an_gi_dishes_hcm_v2';
export const FIREBASE_CONFIG_KEY = 'hom_nay_an_gi_firebase_config_v1';
export const CACHED_API_CONFIG_KEY = 'hom_nay_an_gi_api_config_cache_v1';
export const ADMIN_PIN_HASH_KEY = 'hom_nay_an_gi_admin_pin_hash_v2';
export const ADMIN_EMAIL_KEY = 'hom_nay_an_gi_admin_email_v1';
export const ADMIN_EMAIL_HASH_KEY = 'hom_nay_an_gi_admin_email_hash_v1';
export const RECAPTCHA_KEY = 'hom_nay_an_gi_recaptcha_key_v1';

// Giới hạn chống spam
export const ADD_DISH_COOLDOWN_MS = 10000; // 10 giây giãn cách giữa các lần thêm món
export const MAX_SHARED_DISHES = 80;       // Tối đa 80 món trong danh sách dùng chung
export const REVIEW_COOLDOWN_MS = 15000;   // 15 giây giữa các lần gửi đánh giá
export const MAX_REVIEWS_PER_DISH = 15;    // Tối đa 15 đánh giá mỗi quán

export const DEFAULT_FIREBASE_CONFIG = null;

// Bảng màu 6 tông ấm hài hòa với tông cam thương hiệu
export const SLICE_COLORS = [
  '#f97316', // Cam rực rỡ (Brand vibrant orange)
  '#ea580c', // Đỏ cam hoàng hôn (Warm vermilion)
  '#d97706', // Hổ phách ấm áp (Warm spiced amber)
  '#e11d48', // Đỏ đất nung (Warm terracotta rose)
  '#c2410c', // Quế cay nồng (Deep cinnamon orange)
  '#f59e0b'  // Vàng mật ong (Sunset golden honey)
];

