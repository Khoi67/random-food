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

  it('9. normalizeDish tự gán ID ổn định loc_{dishId}_{index} cho location chưa có ID và bảo toàn review cũ', () => {
    const rawDish = {
      id: 'dish_test_100',
      name: 'Bánh mì chảo',
      locations: [
        { name: 'Quán 1', address: '123 Nguyễn Trãi', reviews: [{ id: 'r1', stars: 5, author: 'Huy', comment: 'Ngon', createdAt: 123 }] },
        { name: 'Quán 2', address: '456 Lê Văn Sỹ' }
      ],
      reviews: [{ id: 'r_main', stars: 4, author: 'An', comment: 'Khá ổn', createdAt: 456 }]
    };
    const norm = normalizeDish(rawDish);
    assert.equal(norm.locations[0].id, 'loc_dish_test_100_0');
    assert.equal(norm.locations[0].reviews.length, 1);
    assert.equal(norm.locations[0].reviews[0].id, 'r1');
    assert.equal(norm.locations[1].id, 'loc_dish_test_100_1');
    assert.equal(norm.reviews.length, 1);
    assert.equal(norm.reviews[0].id, 'r_main');
  });

  it('10. normalizeDish bảo toàn ID location sẵn có không bị ghi đè', () => {
    const dishWithId = {
      id: 'dish_fixed',
      name: 'Phở Bắc',
      locations: [
        { id: 'custom_loc_id_999', name: 'Quán Phở Gia Truyền', address: 'Quận 1' }
      ]
    };
    const norm = normalizeDish(dishWithId);
    assert.equal(norm.locations[0].id, 'custom_loc_id_999');
  });
});

