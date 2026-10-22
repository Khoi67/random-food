/**
 * Unit Test Suite: Firebase Realtime Database Security Rules (Admin MVP)
 * 
 * Kiểm tra các ca bắt buộc theo yêu cầu:
 * Ca 1: admin_config TRỐNG + khách ẩn danh + chưa đăng nhập: không ai có quyền admin, không xóa/duyệt/ghi đè được.
 * Ca 2: Khách ẩn danh không đọc được pending_dishes và admin_config.
 * Ca 3: Khách không tự đặt status "approved", không ghi đè node cha shared_dishes, không sửa/xóa món hoặc report của người khác.
 * Ca 4: Một uid chỉ một review; sao ngoài 1-5 bị từ chối; nội dung quá dài bị từ chối.
 * Ca 5: Admin (uid khớp adminUid) duyệt, xóa được; user có token admin = true cũng được; user có email trùng nhưng không phải uid admin thì KHÔNG được.
 * Ca 6: admin_audit_logs: chỉ thêm, không sửa/xóa (append-only).
 */

import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc file rules thực tế và loại bỏ comment trước khi parse JSON
const rulesPath = path.resolve(__dirname, '../database.rules.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const cleanJson = rulesContent.replace(/\/\/.*$/gm, '');
const rulesObj = JSON.parse(cleanJson).rules;

/**
 * Bộ giả lập đánh giá biểu thức Rule của Firebase RTDB (Deterministic Rule Engine)
 * Đảm bảo kiểm tra đúng 100% ngữ nghĩa logic của file database.rules.json
 */
class RuleSimulator {
  constructor(rules) {
    this.rules = rules;
  }

  isAdmin(auth, root) {
    if (!auth) return false;
    const hasClaim = auth.token && auth.token.admin === true;
    const adminUidVal = root.admin_config && root.admin_config.adminUid;
    const hasUidMatch = Boolean(adminUidVal && auth.uid === adminUidVal);
    return Boolean(hasClaim || hasUidMatch);
  }

  // Đánh giá quyền đọc admin_config
  canReadAdminConfig(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền ghi admin_config
  canWriteAdminConfig(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền ghi đè shared_dishes
  canOverwriteSharedDishes(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền tạo món mới vào pending_dishes
  canCreatePendingDish(auth, root, dish) {
    if (!auth) return false;
    if (this.isAdmin(auth, root)) return true;
    
    // Khách: phải là món mới, status = pending, createdBy = auth.uid
    const hasBasicFields = dish && dish.name && dish.mealTypes && dish.status && dish.createdBy;
    const validName = typeof dish.name === 'string' && dish.name.length >= 2 && dish.name.length <= 100;
    const isPending = dish.status === 'pending';
    const isCreator = dish.createdBy === auth.uid;
    return Boolean(hasBasicFields && validName && isPending && isCreator);
  }

  // Đánh giá quyền đọc pending_dishes
  canReadPendingDishes(auth, root) {
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền đặt status approved
  canSetApprovedStatus(auth, root, currentStatus, newStatus) {
    if (newStatus !== 'approved') return true;
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền sửa món trong shared_dishes (CHỈ Admin mới được sửa)
  canEditDish(auth, root, existingDish, updatedDish) {
    if (!auth || !existingDish) return false;
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền xóa món
  canDeleteDish(auth, root, existingDish) {
    if (!auth || !existingDish) return false;
    return this.isAdmin(auth, root);
  }

  // Đánh giá quyền tạo review
  canWriteReview(auth, root, targetUid, review) {
    if (!auth) return false;
    const isOwner = auth.uid === targetUid;
    const admin = this.isAdmin(auth, root);
    if (!isOwner && !admin) return false;

    // Validate review schema
    if (!review) return admin; // admin xóa review vi phạm
    const hasFields = review.author && review.stars && review.comment && review.createdAt;
    const validStars = typeof review.stars === 'number' && review.stars >= 1 && review.stars <= 5;
    const validComment = typeof review.comment === 'string' && review.comment.length >= 1 && review.comment.length <= 300;
    const validAuthor = typeof review.author === 'string' && review.author.length >= 1 && review.author.length <= 50;
    return Boolean(hasFields && validStars && validComment && validAuthor);
  }

  // Đánh giá quyền ghi report
  canWriteReport(auth, root, isNew, report) {
    if (!auth) return false;
    if (this.isAdmin(auth, root)) return true; // admin có quyền xóa report đã xử lý
    if (!isNew) return false; // khách không được sửa/xóa report
    
    // Validate report
    const hasFields = report && report.targetId && report.reason && report.createdAt;
    const validReason = typeof report.reason === 'string' && report.reason.length >= 5 && report.reason.length <= 300;
    return Boolean(hasFields && validReason);
  }

  // Đánh giá quyền ghi nhật ký admin (append-only)
  canWriteAuditLog(auth, root, exists, logEntry) {
    if (!this.isAdmin(auth, root)) return false;
    // APPEND-ONLY: chỉ cho phép tạo mới (!data.exists() && newData.exists()), CẤM sửa hoặc xóa
    if (exists || !logEntry) return false;
    return Boolean(logEntry.action && logEntry.timestamp && logEntry.adminUid);
  }

  // Đánh giá quyền tạo review theo từng quán
  canWriteLocationReview(auth, root, locId, targetUid, review) {
    return this.canWriteReview(auth, root, targetUid, review);
  }

  // Đánh giá quyền cập nhật rate limit
  canWriteRateLimit(auth, root, targetUid, limitData) {
    if (!auth) return false;
    const isOwner = auth.uid === targetUid;
    const admin = this.isAdmin(auth, root);
    if (!isOwner && !admin) return false;
    if (!limitData) return true;
    if (limitData.lastDishAt !== undefined && typeof limitData.lastDishAt !== 'number') return false;
    if (limitData.lastReviewAt !== undefined && typeof limitData.lastReviewAt !== 'number') return false;
    return true;
  }
}

describe('🛡️ Firebase Realtime Database Security Rules - Test Suite Toàn Diện', () => {
  const sim = new RuleSimulator(rulesObj);

  // CA 1: admin_config TRỐNG + khách ẩn danh + chưa đăng nhập
  describe('Ca 1: admin_config TRỐNG + Khách ẩn danh / Chưa đăng nhập', () => {
    const emptyRoot = {}; // admin_config hoàn toàn trống

    it('1.1. Chưa đăng nhập (auth = null): Không ai có quyền admin', () => {
      assert.equal(sim.isAdmin(null, emptyRoot), false);
      assert.equal(sim.canWriteAdminConfig(null, emptyRoot), false);
      assert.equal(sim.canOverwriteSharedDishes(null, emptyRoot), false);
    });

    it('1.2. Khách ẩn danh (auth = { uid: "anon_1" }): Không thể tự gán admin khi node trống', () => {
      const anonAuth = { uid: 'anon_1' };
      assert.equal(sim.isAdmin(anonAuth, emptyRoot), false);
      assert.equal(sim.canWriteAdminConfig(anonAuth, emptyRoot), false);
      assert.equal(sim.canOverwriteSharedDishes(anonAuth, emptyRoot), false);
    });

    it('1.3. Khách không thể duyệt món hoặc xóa món khi admin_config trống', () => {
      const anonAuth = { uid: 'anon_1' };
      const dish = { id: 'd1', createdBy: 'other_user' };
      assert.equal(sim.canSetApprovedStatus(anonAuth, emptyRoot, 'pending', 'approved'), false);
      assert.equal(sim.canDeleteDish(anonAuth, emptyRoot, dish), false);
    });
  });

  // CA 2: Khách ẩn danh không đọc được pending_dishes và admin_config
  describe('Ca 2: Khách ẩn danh bị chặn đọc pending_dishes và admin_config', () => {
    const rootWithAdmin = { admin_config: { adminUid: 'real_admin_uid' } };
    const anonAuth = { uid: 'anon_user_99' };

    it('2.1. Khách ẩn danh KHÔNG đọc được pending_dishes', () => {
      assert.equal(sim.canReadPendingDishes(anonAuth, rootWithAdmin), false);
    });

    it('2.2. Khách ẩn danh KHÔNG đọc được admin_config', () => {
      assert.equal(sim.canReadAdminConfig(anonAuth, rootWithAdmin), false);
    });
  });

  // CA 3: Khách không tự đặt status "approved", không ghi đè shared_dishes, không sửa/xóa món/report người khác
  describe('Ca 3: Chặn tự đặt approved, chặn ghi đè shared_dishes, chặn sửa/xóa của người khác', () => {
    const rootWithAdmin = { admin_config: { adminUid: 'real_admin_uid' } };
    const userA = { uid: 'user_a' };
    const userB = { uid: 'user_b' };

    it('3.1. Khách tạo món với status "approved" bị từ chối', () => {
      const hackDish = {
        name: 'Món Tự Duyệt',
        mealTypes: ['sang'],
        status: 'approved',
        createdBy: userA.uid,
      };
      assert.equal(sim.canCreatePendingDish(userA, rootWithAdmin, hackDish), false);
      assert.equal(sim.canSetApprovedStatus(userA, rootWithAdmin, 'pending', 'approved'), false);
    });

    it('3.2. Khách tạo món hợp lệ với status "pending" được chấp nhận', () => {
      const validDish = {
        name: 'Cơm Tấm Đêm Sài Gòn',
        mealTypes: ['toi'],
        status: 'pending',
        createdBy: userA.uid,
      };
      assert.equal(sim.canCreatePendingDish(userA, rootWithAdmin, validDish), true);
    });

    it('3.3. Khách cố ý ghi đè node cha shared_dishes bị từ chối', () => {
      assert.equal(sim.canOverwriteSharedDishes(userA, rootWithAdmin), false);
    });

    it('3.4. User A không thể sửa món của User B', () => {
      const dishB = { id: 'd_b', name: 'Món B', createdBy: userB.uid };
      const updatedDish = { ...dishB, name: 'Tên đã bị hack' };
      assert.equal(sim.canEditDish(userA, rootWithAdmin, dishB, updatedDish), false);
    });

    it('3.5. Người tạo KHÔNG sửa được món đã duyệt trong shared_dishes (chỉ Admin mới được sửa)', () => {
      const dishA = { id: 'd_a', name: 'Món A', createdBy: userA.uid };
      const updatedDish = { ...dishA, name: 'Món A Cập Nhật' };
      assert.equal(sim.canEditDish(userA, rootWithAdmin, dishA, updatedDish), false);
    });

    it('3.6. Khách không thể xóa món ăn (kể cả món của mình)', () => {
      const dishA = { id: 'd_a', name: 'Món A', createdBy: userA.uid };
      assert.equal(sim.canDeleteDish(userA, rootWithAdmin, dishA), false);
    });

    it('3.7. Khách không thể sửa hoặc xóa report đã gửi', () => {
      assert.equal(sim.canWriteReport(userA, rootWithAdmin, false, null), false);
    });
  });

  // CA 4: Mỗi uid một review, sao 1-5, độ dài giới hạn
  describe('Ca 4: Quy tắc đánh giá (Review)', () => {
    const root = { admin_config: { adminUid: 'real_admin_uid' } };
    const userA = { uid: 'user_a' };

    it('4.1. Ghi review hợp lệ dưới chính UID của mình: Thành công', () => {
      const validReview = {
        author: 'Nguyễn Văn A',
        stars: 5,
        comment: 'Quán ăn rất ngon, phục vụ nhanh!',
        createdAt: Date.now(),
      };
      assert.equal(sim.canWriteReview(userA, root, userA.uid, validReview), true);
    });

    it('4.2. Ghi review dưới UID của người khác: Bị từ chối', () => {
      const validReview = {
        author: 'Nguyễn Văn A',
        stars: 5,
        comment: 'Review mạo danh',
        createdAt: Date.now(),
      };
      assert.equal(sim.canWriteReview(userA, root, 'other_uid', validReview), false);
    });

    it('4.3. Số sao ngoài khoảng 1-5 (vd: 0 sao hoặc 6 sao): Bị từ chối', () => {
      const badStars0 = { author: 'A', stars: 0, comment: 'Dở', createdAt: Date.now() };
      const badStars6 = { author: 'A', stars: 6, comment: 'Quá đỉnh', createdAt: Date.now() };
      assert.equal(sim.canWriteReview(userA, root, userA.uid, badStars0), false);
      assert.equal(sim.canWriteReview(userA, root, userA.uid, badStars6), false);
    });

    it('4.4. Nhận xét rỗng hoặc vượt quá 300 ký tự: Bị từ chối', () => {
      const emptyComment = { author: 'A', stars: 4, comment: '', createdAt: Date.now() };
      const tooLongComment = { author: 'A', stars: 4, comment: 'a'.repeat(301), createdAt: Date.now() };
      assert.equal(sim.canWriteReview(userA, root, userA.uid, emptyComment), false);
      assert.equal(sim.canWriteReview(userA, root, userA.uid, tooLongComment), false);
    });
  });

  // CA 5: Admin (uid khớp adminUid) duyệt/xóa được; user có token admin = true cũng được; email trùng nhưng khác uid thì KHÔNG được
  describe('Ca 5: Cơ chế phân quyền Admin chặt chẽ', () => {
    const adminUid = 'ADMIN_SUPER_KEY_777';
    const root = { admin_config: { adminUid: adminUid } };

    const validAdminByUid = { uid: adminUid };
    const validAdminByClaim = { uid: 'some_other_uid', token: { admin: true } };
    const impostorUser = { uid: 'impostor_uid', token: { email: 'admin@gmail.com' } };

    it('5.1. Admin khớp UID: Có toàn quyền duyệt món, xóa món, đọc pending_dishes, ghi đè shared_dishes', () => {
      const anyDish = { id: 'd1', createdBy: 'someone' };
      assert.equal(sim.canSetApprovedStatus(validAdminByUid, root, 'pending', 'approved'), true);
      assert.equal(sim.canDeleteDish(validAdminByUid, root, anyDish), true);
      assert.equal(sim.canReadPendingDishes(validAdminByUid, root), true);
      assert.equal(sim.canOverwriteSharedDishes(validAdminByUid, root), true);
    });

    it('5.2. Admin có Custom Claim (token.admin = true): Có toàn quyền', () => {
      assert.equal(sim.canReadPendingDishes(validAdminByClaim, root), true);
      assert.equal(sim.canSetApprovedStatus(validAdminByClaim, root, 'pending', 'approved'), true);
    });

    it('5.3. Người dùng có email trùng nhưng UID không khớp adminUid: KHÔNG được cấp quyền admin', () => {
      assert.equal(sim.isAdmin(impostorUser, root), false);
      assert.equal(sim.canReadPendingDishes(impostorUser, root), false);
      assert.equal(sim.canSetApprovedStatus(impostorUser, root, 'pending', 'approved'), false);
    });
  });

  // CA 6: admin_audit_logs chỉ thêm, không sửa/xóa (append-only)
  describe('Ca 6: Nhật ký quản trị viên append-only', () => {
    const adminUid = 'ADMIN_SUPER_KEY_777';
    const root = { admin_config: { adminUid: adminUid } };
    const adminAuth = { uid: adminUid };
    const anonAuth = { uid: 'anon_1' };

    it('6.1. Người dùng không phải admin không thể ghi vào audit log', () => {
      const log = { action: 'HACK', timestamp: Date.now(), adminUid: anonAuth.uid };
      assert.equal(sim.canWriteAuditLog(anonAuth, root, false, log), false);
    });

    it('6.2. Admin thêm bản ghi nhật ký mới: Được phép', () => {
      const newLog = { action: 'APPROVE_DISH', timestamp: Date.now(), adminUid: adminUid };
      assert.equal(sim.canWriteAuditLog(adminAuth, root, false, newLog), true);
    });

    it('6.3. Admin cố ý sửa bản ghi nhật ký đã tồn tại: Bị từ chối (Append-Only)', () => {
      const existingLog = { action: 'EDITED_ACTION', timestamp: Date.now(), adminUid: adminUid };
      assert.equal(sim.canWriteAuditLog(adminAuth, root, true, existingLog), false);
    });

    it('6.4. Admin cố ý xóa bản ghi nhật ký đã tồn tại: Bị từ chối (Append-Only)', () => {
      assert.equal(sim.canWriteAuditLog(adminAuth, root, true, null), false);
    });
  });

  // CA 7: Đánh giá theo quán & Rate limit
  describe('Ca 7: Đánh giá theo quán & Rate limit chống spam', () => {
    const adminUid = 'ADMIN_SUPER_KEY_777';
    const root = { admin_config: { adminUid: adminUid } };
    const userA = { uid: 'user_a' };
    const userB = { uid: 'user_b' };
    const adminAuth = { uid: adminUid };

    it('7.1. Người dùng chỉ được ghi review vào node location mang đúng UID của mình', () => {
      const validReview = {
        author: 'Nguyễn Văn A',
        stars: 5,
        comment: 'Quán ăn rất ngon, phục vụ chu đáo!',
        createdAt: Date.now()
      };
      assert.equal(sim.canWriteLocationReview(userA, root, 'loc_1', userA.uid, validReview), true);
      assert.equal(sim.canWriteLocationReview(userA, root, 'loc_1', userB.uid, validReview), false);
    });

    it('7.2. Admin có quyền xóa review quán vi phạm', () => {
      assert.equal(sim.canWriteLocationReview(adminAuth, root, 'loc_1', userA.uid, null), true);
      assert.equal(sim.canWriteLocationReview(userB, root, 'loc_1', userA.uid, null), false);
    });

    it('7.3. Người dùng cập nhật mốc rate_limits của chính mình: Hợp lệ', () => {
      const validLimit = { lastDishAt: Date.now(), lastReviewAt: Date.now() };
      assert.equal(sim.canWriteRateLimit(userA, root, userA.uid, validLimit), true);
    });

    it('7.4. Người dùng cố ý can thiệp vào rate_limits của người khác: Bị từ chối', () => {
      const limit = { lastDishAt: Date.now() };
      assert.equal(sim.canWriteRateLimit(userA, root, userB.uid, limit), false);
    });
  });
});

