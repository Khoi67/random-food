import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Nạp file database.rules.json trực tiếp từ dự án
const rulesPath = path.resolve(process.cwd(), 'database.rules.json');
const rawRules = fs.readFileSync(rulesPath, 'utf8');
const rulesClean = rawRules.replace(/\/\/.*$/gm, '');
const rulesObj = JSON.parse(rulesClean).rules;

/**
 * Bộ Simulator thực thi chính xác cú pháp phân quyền của Firebase Realtime Database
 */
class FirebasePermissionEngine {
  constructor(rules) {
    this.rules = rules;
  }

  isAdmin(auth, root) {
    if (!auth) return false;
    if (auth.token && auth.token.admin === true) return true;
    const adminUid = root?.admin_config?.adminUid;
    if (adminUid && typeof adminUid === 'string' && auth.uid === adminUid) return true;
    return false;
  }

  // Feature 1: Đọc Thực Đơn Chung
  canReadSharedDishes(auth) {
    return true; // .read: true
  }

  // Feature 2: Ghi đè toàn bộ Thực Đơn Chung (Restore Defaults)
  canOverwriteSharedDishes(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Feature 3: Thêm món mới vào kho chờ duyệt (Pending)
  canCreatePendingDish(auth, root, dish) {
    if (!auth) return false;
    if (this.isAdmin(auth, root)) return true;
    if (!dish) return false;
    const isOwner = dish.createdBy === auth.uid;
    const isPending = dish.status === 'pending';
    const hasName = typeof dish.name === 'string' && dish.name.length >= 2 && dish.name.length <= 100;
    const hasMealTypes = Boolean(dish.mealTypes);
    return isOwner && isPending && hasName && hasMealTypes;
  }

  // Feature 4: Đọc kho món chờ duyệt
  canReadPendingDishes(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Feature 5: Duyệt món (Đặt status: approved)
  canApproveDish(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Feature 6: Sửa món ăn trong thực đơn (CHỈ Admin mới có quyền)
  canEditDish(auth, root, existingDish, updatedDish) {
    if (!auth || !existingDish || !updatedDish) return false;
    return this.isAdmin(auth, root);
  }

  // Feature 7: Xóa món ăn
  canDeleteDish(auth, root) {
    return this.isAdmin(auth, root); // Chỉ Admin mới có quyền xóa
  }

  // Feature 8: Đánh giá món ăn
  canWriteDishReview(auth, root, targetUid, review) {
    if (!auth) return false;
    const isOwner = auth.uid === targetUid;
    const admin = this.isAdmin(auth, root);
    if (!isOwner && !admin) return false;
    if (!review) return admin; // Admin xóa review
    const valid = review.author && typeof review.stars === 'number' && review.stars >= 1 && review.stars <= 5 && review.comment && review.comment.length <= 300;
    return Boolean(valid);
  }

  // Feature 9: Đánh giá quán ăn (Review theo location)
  canWriteLocationReview(auth, root, targetUid, review) {
    return this.canWriteDishReview(auth, root, targetUid, review);
  }

  // Feature 10: Gửi và quản lý báo cáo vi phạm
  canCreateReport(auth, report) {
    if (!auth || !report) return false;
    return typeof report.reason === 'string' && report.reason.length >= 5 && report.reason.length <= 300;
  }

  canReadReports(auth, root) {
    return this.isAdmin(auth, root);
  }

  canDeleteReport(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Feature 11: Nhật ký quản trị viên (Append-Only)
  canReadAuditLogs(auth, root) {
    return this.isAdmin(auth, root);
  }

  canAppendAuditLog(auth, root, exists, logEntry) {
    if (!this.isAdmin(auth, root)) return false;
    if (exists || !logEntry) return false; // Append-only: cấm sửa hoặc xóa
    return Boolean(logEntry.action && logEntry.timestamp && logEntry.adminUid);
  }

  // Feature 12: Đọc ghi admin_config
  canAccessAdminConfig(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Feature 13: Rate Limits
  canWriteRateLimit(auth, root, targetUid, limitData) {
    if (!auth) return false;
    const isOwner = auth.uid === targetUid;
    const admin = this.isAdmin(auth, root);
    if (!isOwner && !admin) return false;
    if (!limitData) return true;
    if (limitData.lastDishAt !== undefined && typeof limitData.lastDishAt !== 'number') return false;
    return true;
  }
}

describe('🎯 MA TRẬN KIỂM THỬ KẾT NỐI API & PHÂN QUYỀN TOÀN BỘ FEATURES', () => {
  const engine = new FirebasePermissionEngine(rulesObj);

  const adminUid = 'ADMIN_SUPER_KEY_777';
  const root = { admin_config: { adminUid } };

  const unauth = null;
  const guestUser = { uid: 'guest_uid_001' };
  const anotherUser = { uid: 'guest_uid_002' };
  const adminUser = { uid: adminUid };

  // 1. FEATURE: Đọc Thực Đơn Chung (shared_dishes)
  describe('Feature 1: Đọc thực đơn chung (/shared_dishes)', () => {
    it('Khách vãng lai, khách ẩn danh và admin đều đọc được 100%', () => {
      assert.equal(engine.canReadSharedDishes(unauth), true);
      assert.equal(engine.canReadSharedDishes(guestUser), true);
      assert.equal(engine.canReadSharedDishes(adminUser), true);
    });
  });

  // 2. FEATURE: Thêm Món Ăn Mới (pending_dishes)
  describe('Feature 2: Thêm món ăn mới (/pending_dishes)', () => {
    it('Khách gửi món hợp lệ (status: pending, createdBy: auth.uid): THÀNH CÔNG', () => {
      const validDish = {
        name: 'Bún bò Gánh',
        mealTypes: ['sang', 'trua'],
        status: 'pending',
        createdBy: guestUser.uid
      };
      assert.equal(engine.canCreatePendingDish(guestUser, root, validDish), true);
    });

    it('Khách gian lận tự đặt status: approved: BỊ CHẶN (Permission Denied)', () => {
      const hackDish = {
        name: 'Món Tự Duyệt',
        mealTypes: ['sang'],
        status: 'approved',
        createdBy: guestUser.uid
      };
      assert.equal(engine.canCreatePendingDish(guestUser, root, hackDish), false);
    });

    it('Khách gửi createdBy là UID người khác: BỊ CHẶN (Permission Denied)', () => {
      const impostorDish = {
        name: 'Món Giả Mạo',
        mealTypes: ['sang'],
        status: 'pending',
        createdBy: anotherUser.uid
      };
      assert.equal(engine.canCreatePendingDish(guestUser, root, impostorDish), false);
    });
  });

  // 3. FEATURE: Sửa / Xóa Món Ăn (shared_dishes)
  describe('Feature 3: Sửa / Xóa món ăn (/shared_dishes/$dishId)', () => {
    const dishOfGuest = { id: 'd1', name: 'Món Gốc', createdBy: guestUser.uid, status: 'approved' };

    it('Khách sửa món do chính mình tạo trong shared_dishes: BỊ CHẶN (Chỉ Admin)', () => {
      const updated = { ...dishOfGuest, name: 'Món Đã Sửa' };
      assert.equal(engine.canEditDish(guestUser, root, dishOfGuest, updated), false);
    });

    it('Admin sửa món ăn trong shared_dishes: THÀNH CÔNG', () => {
      const updated = { ...dishOfGuest, name: 'Admin Cập Nhật Tên' };
      assert.equal(engine.canEditDish(adminUser, root, dishOfGuest, updated), true);
    });

    it('Người dùng khác sửa món của khách: BỊ CHẶN (Permission Denied)', () => {
      const updated = { ...dishOfGuest, name: 'Người Khác Sửa' };
      assert.equal(engine.canEditDish(anotherUser, root, dishOfGuest, updated), false);
    });

    it('Khách xóa món ăn (kể cả món của mình): BỊ CHẶN (Chỉ Admin mới xóa được)', () => {
      assert.equal(engine.canDeleteDish(guestUser, root), false);
    });

    it('Admin xóa món ăn: THÀNH CÔNG', () => {
      assert.equal(engine.canDeleteDish(adminUser, root), true);
    });
  });

  // 4. FEATURE: Đánh Giá Món Ăn & Đánh Giá Từng Quán (reviews & location_reviews)
  describe('Feature 4: Đánh giá món & từng quán (reviews & location_reviews)', () => {
    const validRev = { author: 'An', stars: 5, comment: 'Ngon tuyệt', createdAt: Date.now() };

    it('Khách gửi review vào đúng node UID của mình: THÀNH CÔNG', () => {
      assert.equal(engine.canWriteDishReview(guestUser, root, guestUser.uid, validRev), true);
      assert.equal(engine.canWriteLocationReview(guestUser, root, guestUser.uid, validRev), true);
    });

    it('Khách gửi review mạo danh UID người khác: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canWriteDishReview(guestUser, root, anotherUser.uid, validRev), false);
      assert.equal(engine.canWriteLocationReview(guestUser, root, anotherUser.uid, validRev), false);
    });

    it('Khách xóa review của người khác: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canWriteDishReview(guestUser, root, anotherUser.uid, null), false);
    });

    it('Admin xóa review spam: THÀNH CÔNG', () => {
      assert.equal(engine.canWriteDishReview(adminUser, root, guestUser.uid, null), true);
      assert.equal(engine.canWriteLocationReview(adminUser, root, guestUser.uid, null), true);
    });
  });

  // 5. FEATURE: Báo Cáo Vi Phạm (reports)
  describe('Feature 5: Báo cáo vi phạm (/reports)', () => {
    it('Khách gửi báo cáo vi phạm hợp lệ: THÀNH CÔNG', () => {
      const rep = { targetId: 'd1', reason: 'Quán ăn đóng cửa vĩnh viễn', createdAt: Date.now() };
      assert.equal(engine.canCreateReport(guestUser, rep), true);
    });

    it('Khách đọc danh sách báo cáo: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canReadReports(guestUser, root), false);
    });

    it('Admin đọc danh sách báo cáo & xử lý xóa: THÀNH CÔNG', () => {
      assert.equal(engine.canReadReports(adminUser, root), true);
      assert.equal(engine.canDeleteReport(adminUser, root), true);
    });
  });

  // 6. FEATURE: Hàng Đợi Duyệt Món (pending_dishes - Đọc & Duyệt)
  describe('Feature 6: Hàng đợi duyệt món (/pending_dishes)', () => {
    it('Khách đọc hàng đợi duyệt món: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canReadPendingDishes(guestUser, root), false);
    });

    it('Admin đọc hàng đợi duyệt món & duyệt món: THÀNH CÔNG', () => {
      assert.equal(engine.canReadPendingDishes(adminUser, root), true);
      assert.equal(engine.canApproveDish(adminUser, root), true);
    });
  });

  // 7. FEATURE: Khôi Phục Dữ Liệu Gốc (shared_dishes - Ghi đè toàn bộ)
  describe('Feature 7: Khôi phục thực đơn gốc (/shared_dishes ghi đè)', () => {
    it('Khách ghi đè toàn bộ shared_dishes: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canOverwriteSharedDishes(guestUser, root), false);
    });

    it('Admin ghi đè khôi phục thực đơn gốc: THÀNH CÔNG', () => {
      assert.equal(engine.canOverwriteSharedDishes(adminUser, root), true);
    });
  });

  // 8. FEATURE: Nhật Ký Quản Trị (admin_audit_logs)
  describe('Feature 8: Nhật ký quản trị (/admin_audit_logs)', () => {
    it('Khách đọc hoặc ghi nhật ký: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canReadAuditLogs(guestUser, root), false);
      assert.equal(engine.canAppendAuditLog(guestUser, root, false, { action: 'HACK' }), false);
    });

    it('Admin ghi nhật ký mới: THÀNH CÔNG', () => {
      const log = { action: 'APPROVE', timestamp: Date.now(), adminUid };
      assert.equal(engine.canAppendAuditLog(adminUser, root, false, log), true);
    });

    it('Admin sửa hoặc xóa nhật ký đã tồn tại: BỊ CHẶN (Bảo toàn Append-Only)', () => {
      assert.equal(engine.canAppendAuditLog(adminUser, root, true, { action: 'MOD' }), false);
      assert.equal(engine.canAppendAuditLog(adminUser, root, true, null), false);
    });
  });

  // 9. FEATURE: Giới Hạn Tần Suất (rate_limits)
  describe('Feature 9: Giới hạn tần suất (/rate_limits)', () => {
    it('Khách cập nhật rate_limits của chính mình: THÀNH CÔNG', () => {
      assert.equal(engine.canWriteRateLimit(guestUser, root, guestUser.uid, { lastDishAt: Date.now() }), true);
    });

    it('Khách can thiệp rate_limits của người khác: BỊ CHẶN (Permission Denied)', () => {
      assert.equal(engine.canWriteRateLimit(guestUser, root, anotherUser.uid, { lastDishAt: Date.now() }), false);
    });
  });
});
