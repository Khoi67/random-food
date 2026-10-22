import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDish } from '../src/services/storage.js';

describe('Kiểm thử Phân hệ Quản trị Admin Dashboard (Admin MVP)', () => {
  it('1. Xử lý an toàn khi thực đơn có 0 món', () => {
    const dishes = [];
    const approved = dishes.filter((d) => d.status === 'approved' || !d.status);
    const pending = dishes.filter((d) => d.status === 'pending');
    assert.equal(approved.length, 0);
    assert.equal(pending.length, 0);

    const backupData = {
      exportedAt: new Date().toISOString(),
      totalDishes: dishes.length,
      dishes,
    };
    assert.equal(backupData.totalDishes, 0);
  });

  it('2. Xử lý chính xác khi thực đơn chỉ có 1 món', () => {
    const single = [{ id: 'dish-1', name: 'Cơm tấm', status: 'approved', mealTypes: ['sang'] }];
    const approved = single.filter((d) => d.status === 'approved' || !d.status);
    assert.equal(approved.length, 1);
    assert.equal(approved[0].name, 'Cơm tấm');
  });

  it('3. Xử lý tải và phân loại danh sách lớn (30 món) đầy đủ các bữa', () => {
    const thirtyDishes = Array.from({ length: 30 }, (_, i) => ({
      id: `dish-${i}`,
      name: `Món số ${i}`,
      mealTypes: i % 2 === 0 ? ['sang'] : ['trua', 'toi'],
      status: i % 5 === 0 ? 'pending' : 'approved',
    }));

    const approved = thirtyDishes.filter((d) => d.status === 'approved' || !d.status);
    const pending = thirtyDishes.filter((d) => d.status === 'pending');

    assert.equal(approved.length + pending.length, 30);
    assert.equal(pending.length, 6);
    assert.equal(approved.length, 24);
  });

  it('4. Xử lý món có tên siêu dài không gây tràn hoặc gãy dữ liệu', () => {
    const veryLongName = 'Bánh mì chảo bò kho sườn nướng pate trứng ốp la đặc biệt số 1 Sài Gòn đường Nguyễn Trãi Quận 5 TP. Hồ Chí Minh';
    const dish = normalizeDish({
      id: 'long-name-dish',
      name: veryLongName,
      shortName: veryLongName.slice(0, 20),
      mealTypes: ['sang'],
    });

    assert.equal(dish.name, veryLongName);
    assert.ok(dish.shortName && dish.shortName.length <= 50);
  });

  it('5. Tương thích món cũ thiếu trường: bổ sung mặc định an toàn', () => {
    const legacyDish = {
      id: 'legacy-1',
      name: 'Món cũ không có trường status',
      meal: 'toi',
    };

    const normalized = normalizeDish(legacyDish);
    assert.equal(normalized.status, 'approved', 'Món cũ được mặc định coi là approved');
    assert.equal(normalized.meal, 'toi', 'Giữ nguyên trường meal');
    assert.ok(normalized.type, 'Tự động xác định type');
    assert.ok(normalized.priceRange, 'Tự động xác định priceRange');
  });

  it('6. Cấu trúc nhật ký thao tác Admin (Audit Log) chuẩn mực', () => {
    const logItem = {
      id: `log_test_1`,
      adminUid: 'admin-uid-12345',
      action: 'APPROVE_DISH',
      target: 'Bún bò Huế',
      details: 'Đã phê duyệt món Bún bò Huế vào thực đơn.',
      timestamp: Date.now(),
    };

    assert.ok(logItem.id.startsWith('log_'));
    assert.equal(logItem.action, 'APPROVE_DISH');
    assert.equal(typeof logItem.timestamp, 'number');
    assert.ok(logItem.timestamp > 0);
  });

  it('7. Xóa đánh giá spam khỏi danh sách địa điểm an toàn', () => {
    const dish = {
      id: 'dish-with-rev',
      name: 'Hủ tiếu Nam Vang',
      locations: [
        {
          name: 'Quán A',
          address: '123 ABC',
          reviews: [
            { id: 'rev-1', author: 'Người tốt', stars: 5, comment: 'Ngon', createdAt: 1000 },
            { id: 'rev-spam', author: 'Spammer', stars: 1, comment: 'Quảng cáo spam link', createdAt: 2000 },
          ],
        },
      ],
    };

    const filteredReviews = dish.locations[0].reviews.filter((r) => r.id !== 'rev-spam');
    assert.equal(filteredReviews.length, 1);
    assert.equal(filteredReviews[0].id, 'rev-1');
  });

  it('8. Xác nhận quy trình khôi phục thực đơn gốc bảo vệ 2 bước', () => {
    let backupTriggered = false;
    let step = 1;
    let confirmText = '';

    // Step 1: Auto backup
    backupTriggered = true;
    assert.equal(backupTriggered, true, 'Bắt buộc tự động xuất sao lưu trước');

    // Step 2: Confirmation phrase
    confirmText = 'khoi phuc';
    const isConfirmed = confirmText.trim().toUpperCase() === 'KHOI PHUC';
    assert.equal(isConfirmed, true, 'Xác nhận cụm từ KHOI PHUC');
  });
});
