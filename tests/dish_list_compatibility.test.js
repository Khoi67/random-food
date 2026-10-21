import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterDishes } from '../src/utils/filterLogic.js';
import { normalizeDish } from '../src/services/storage.js';

describe('Kiểm tra tương thích Thực đơn & Dữ liệu Cũ (DishList & Data Compatibility)', () => {
  it('1. Xử lý danh sách rỗng an toàn không gây crash', () => {
    const res = filterDishes([], { currentMeal: 'sang' });
    assert.deepEqual(res, []);
  });

  it('2. Xử lý danh sách chỉ có 1 món', () => {
    const single = [{ id: '1', name: 'Phở', mealTypes: ['sang'] }];
    const res = filterDishes(single, { currentMeal: 'sang' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'Phở');
  });

  it('3. Xử lý danh sách lớn (30 món)', () => {
    const thirtyDishes = Array.from({ length: 30 }, (_, i) => ({
      id: `dish-${i}`,
      name: `Món ăn số ${i}`,
      mealTypes: ['sang', 'trua'],
      status: 'approved',
    }));
    const res = filterDishes(thirtyDishes, { currentMeal: 'sang' });
    assert.equal(res.length, 30);
  });

  it('4. Xử lý món có tên rất dài không lỗi', () => {
    const longName = 'Cơm tấm sườn bì chả trứng ốp la Ba Ghiền đặc biệt siêu to khổng lồ quận Phú Nhuận TP. Hồ Chí Minh';
    const dish = { id: 'long-1', name: longName, mealTypes: ['sang'] };
    const res = filterDishes([dish], { currentMeal: 'sang' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, longName);
  });

  it('5. Tương thích món CŨ thiếu trường (chỉ có meal chuỗi, không có mealTypes, không có status)', () => {
    const oldDish = {
      id: 'old-1',
      name: 'Món ăn thời kỳ đầu',
      meal: 'sang', // Trường cũ
    };
    const res = filterDishes([oldDish], { currentMeal: 'sang' });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 'old-1');
  });

  it('6. Soft migration qua normalizeDish bổ sung đầy đủ trường mặc định cho món cũ', () => {
    const oldDish = {
      id: 'old-bún',
      name: 'Bún bò Huế xưa',
      meal: 'sang',
    };
    const normalized = normalizeDish(oldDish);

    assert.equal(normalized.type, 'nuoc', 'Tự động gán món nước');
    assert.equal(normalized.vegetarian, false);
    assert.ok(normalized.priceRange, 'Tự động gán khoảng giá');
    assert.equal(normalized.status, 'approved');
    assert.ok(Array.isArray(normalized.tags));
  });

  it('7. Xử lý an toàn khi dish thiếu name hoặc name rỗng', () => {
    const brokenDish = { id: 'broken-1', mealTypes: ['sang'] };
    const res = filterDishes([brokenDish], { currentMeal: 'sang' });
    assert.equal(res.length, 1);
  });

  it('8. Xử lý an toàn khi locations là mảng các chuỗi string (format cũ)', () => {
    const oldLocationsDish = {
      id: 'old-loc-1',
      name: 'Hủ tiếu',
      mealTypes: ['sang'],
      locations: ['84 Đặng Văn Ngữ, Phú Nhuận', 'Quán thứ hai'],
    };
    const res = filterDishes([oldLocationsDish], { currentMeal: 'sang' });
    assert.equal(res.length, 1);
    assert.equal(res[0].locations.length, 2);
  });
});
