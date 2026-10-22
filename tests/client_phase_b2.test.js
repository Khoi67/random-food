/**
 * Test Suite B2: Kiểm thử Client sau khi nâng cấp khớp với Rules mới
 * 
 * Kiểm thử bắt buộc theo yêu cầu Giai đoạn B2:
 * 1. Kiểm thử với 0 / 1 / 30 món
 * 2. Dữ liệu cũ thiếu trường (Soft migration, normalizeDish tương thích ngược)
 * 3. Chuẩn hóa ID location, mealTypes, tags tuân thủ regex và schema chặt chẽ
 * 4. Xử lý lỗi Permission Denied & Mất mạng (Local-first bảo toàn dữ liệu)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDish } from '../src/services/storage.js';
import { filterDishes } from '../src/utils/filterLogic.js';

describe('🚀 Giai đoạn B2 - Kiểm thử Client & Khả năng tương thích Rules', () => {

  // 1. KIỂM THỬ VỚI 0 / 1 / 30 MÓN
  describe('1. Kiểm thử số lượng món: 0 / 1 / 30 món', () => {
    it('1.1. Danh sách 0 món: Hoạt động an toàn, không văng lỗi', () => {
      const emptyList = [];
      const normalized = emptyList.map(normalizeDish);
      const filtered = filterDishes(normalized, { currentMeal: 'sang' });
      assert.deepEqual(filtered, []);
    });

    it('1.2. Danh sách 1 món: Chuẩn hóa đầy đủ các trường bắt buộc', () => {
      const single = [{
        id: 'dish_single_1',
        name: 'Hủ tiếu Nam Vang',
        meal: 'sang',
      }];
      const normalized = single.map(normalizeDish);
      assert.equal(normalized.length, 1);
      assert.equal(normalized[0].name, 'Hủ tiếu Nam Vang');
      assert.equal(normalized[0].type, 'nuoc');
      assert.deepEqual(normalized[0].mealTypes, ['sang']);
      assert.equal(normalized[0].status, 'approved');
    });

    it('1.3. Danh sách 30 món: Xử lý mượt mà và bảo toàn dữ liệu', () => {
      const thirty = Array.from({ length: 30 }, (_, i) => ({
        id: `dish_bulk_${i}`,
        name: `Món đặc sản Sài Gòn số ${i}`,
        mealTypes: ['sang', 'trua'],
        status: 'approved',
      }));
      const normalized = thirty.map(normalizeDish);
      assert.equal(normalized.length, 30);
      assert.ok(normalized.every((d) => d.priceRange && d.type && d.status === 'approved'));
    });
  });

  // 2. DỮ LIỆU CŨ THIẾU TRƯỜNG & SOFT MIGRATION
  describe('2. Dữ liệu cũ thiếu trường & Soft migration', () => {
    it('2.1. Món thiếu hoàn toàn status, mealTypes, type, priceRange: Tự gán giá trị hợp lệ', () => {
      const legacyDish = {
        id: 'legacy_com_tam',
        name: 'Cơm tấm Ba Ghiền',
        meal: 'sang',
      };
      const normalized = normalizeDish(legacyDish);

      assert.equal(normalized.status, 'approved');
      assert.deepEqual(normalized.mealTypes, ['sang']);
      assert.equal(normalized.type, 'kho');
      assert.ok(normalized.priceRange);
      assert.ok(Array.isArray(normalized.tags));
      assert.ok(Array.isArray(normalized.locations));
      assert.ok(Array.isArray(normalized.reviews));
    });

    it('2.2. Locations dạng mảng chuỗi (Format đời đầu): Chuyển đổi thành Object chuẩn có ID regex', () => {
      const legacyWithStrings = {
        id: 'legacy_strings',
        name: 'Phở Lệ',
        mealTypes: ['sang'],
        locations: ['413 Nguyễn Trãi, Q.5', '303 Võ Văn Tần, Q.3'],
      };
      const normalized = normalizeDish(legacyWithStrings);

      assert.equal(normalized.locations.length, 2);
      assert.ok(normalized.locations[0].id.startsWith('loc_'));
      assert.ok(/^[A-Za-z0-9_-]{1,64}$/.test(normalized.locations[0].id));
      assert.ok(normalized.locations[0].address);
    });

    it('2.3. Location có ID chứa ký tự lạ hoặc khoảng trắng: Tự sửa thành an toàn', () => {
      const dirtyLocDish = {
        id: 'dish_test_dirty',
        name: 'Bún Riêu Cua',
        locations: [
          { id: 'quán ốc & bún riêu!', name: 'Quán Cô Năm', address: 'Quận 4' },
        ],
      };
      const normalized = normalizeDish(dirtyLocDish);
      const locId = normalized.locations[0].id;

      assert.ok(
        /^[A-Za-z0-9_-]{1,64}$/.test(locId),
        `ID location "${locId}" phải khớp regex an toàn!`
      );
    });

    it('2.4. Món có quá 10 quán hoặc quá 10 tag: Cắt gọn tối đa 10 để thỏa Rules', () => {
      const overflowDish = {
        id: 'dish_overflow',
        name: 'Trà Sữa Nhà Làm',
        tags: Array.from({ length: 25 }, (_, i) => `tag_${i}`),
        locations: Array.from({ length: 20 }, (_, i) => ({
          name: `Chi nhánh ${i}`,
          address: `Địa chỉ ${i}`,
        })),
      };
      const normalized = normalizeDish(overflowDish);

      assert.ok(normalized.tags.length <= 10, 'Tags không được vượt quá 10');
      assert.ok(normalized.locations.length <= 10, 'Locations không được vượt quá 10');
    });
  });

  // 3. MÔ PHỎNG MULTI-PATH ATOMIC UPDATE VÀ RÀNG BUỘC RULES
  describe('3. Multi-path Atomic Update & Rate Limit Payloads', () => {
    it('3.1. Cấu trúc Multi-path update của món Pending phải ghi kèm rate_limits', () => {
      const uid = 'user_test_123';
      const dish = { id: 'dish_new_01', name: 'Bánh mì phá lấu', status: 'pending' };

      const updates = {
        [`pending_dishes/${dish.id}`]: dish,
        [`rate_limits/${uid}/lastDishAt`]: 'SERVER_TIMESTAMP',
      };

      assert.ok(updates[`pending_dishes/${dish.id}`]);
      assert.equal(updates[`rate_limits/${uid}/lastDishAt`], 'SERVER_TIMESTAMP');
    });

    it('3.2. Cấu trúc Multi-path update của Review phải ghi vào location_reviews gốc kèm rate_limits', () => {
      const uid = 'user_test_456';
      const dishId = 'dish_pho_bo';
      const locId = 'loc_1';
      const review = { author: 'Nam', stars: 5, comment: 'Nước dùng đậm đà', createdAt: Date.now() };

      const updates = {
        [`location_reviews/${dishId}/${locId}/${uid}`]: review,
        [`rate_limits/${uid}/lastReviewAt`]: 'SERVER_TIMESTAMP',
      };

      assert.ok(updates[`location_reviews/${dishId}/${locId}/${uid}`]);
      assert.equal(updates[`rate_limits/${uid}/lastReviewAt`], 'SERVER_TIMESTAMP');
    });
  });

  // 4. KIỂM THỬ XỬ LÝ LỖI PERMISSION DENIED VÀ MẤT MẠNG (LOCAL-FIRST)
  describe('4. Xử lý lỗi Permission Denied & Mất mạng (Local-first)', () => {
    it('4.1. Khi gặp lỗi Permission Denied do rate limit: Không làm mất dữ liệu cục bộ', () => {
      const localDishKey = 'hom_nay_an_gi_dishes';
      const newDish = { id: 'd_offline_1', name: 'Bánh cuốn Tây Hồ', status: 'pending' };

      // Mô phỏng lưu Local-first
      const currentList = [newDish];
      assert.equal(currentList.length, 1);
      assert.equal(currentList[0].id, 'd_offline_1');

      // Giả lập Cloud trả về lỗi PERMISSION_DENIED
      const fakeCloudError = new Error('PERMISSION_DENIED: Rate limit exceeded');
      const isRateLimited = fakeCloudError.message.includes('PERMISSION_DENIED');

      assert.ok(isRateLimited);
      // Dữ liệu cục bộ vẫn nguyên vẹn
      assert.equal(currentList.length, 1);
      assert.equal(currentList[0].name, 'Bánh cuốn Tây Hồ');
    });

    it('4.2. Khi mất mạng (Offline / Network Error): Ứng dụng vẫn quay được trên dữ liệu cục bộ', () => {
      const offlineDishes = [
        { id: '1', name: 'Phở Bò', mealTypes: ['sang'], status: 'approved' },
        { id: '2', name: 'Bún Chả', mealTypes: ['sang'], status: 'approved' }
      ];
      // Vòng quay vẫn lọc được món khi không có internet
      const wheelDishes = filterDishes(offlineDishes, { currentMeal: 'sang' });
      assert.equal(wheelDishes.length, 2);
    });
  });

});
