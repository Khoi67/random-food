# 🤖 AGENTS.md — Quy Chuẩn Chung Dành Cho AI Agent

## 1. Mô Tả Dự Án
- **Random Food (Hôm Nay Ăn Gì - TP.HCM)**: Ứng dụng PWA hỗ trợ người dùng chọn món ăn ngẫu nhiên tại TP.HCM theo bữa, khoảng giá và GPS.
- **Công nghệ**: React 19 + TypeScript + Vite, Canvas 2D Engine (Offscreen GPU Buffer), Local-First + Firebase Realtime DB.
- **Mục tiêu**: Vòng quay 60fps mượt mà, hoạt động offline ổn định, đồng bộ realtime và bảo mật danh tính Admin tuyệt đối.

---

## 2. Các Điều Cấm Tuyệt Đối (Non-Negotiable)
1. **CẤM `git push` hoặc deploy tự động**: Chỉ `git commit` cục bộ khi người dùng yêu cầu; CHỈ push/deploy khi có lệnh trực tiếp trong chat.
2. **CẤM gian lận kiểm thử**: Không xóa test, không tắt TypeScript (`@ts-ignore`, ép kiểu vô căn cứ), không dùng `--no-verify` hay bất kỳ thủ thuật nào để "cho qua" kiểm thử.
3. **CẤM làm lộ thông tin nhạy cảm**: Không in email cá nhân, biến `ADMIN_EMAIL` hay khóa bí mật ra UI text, Toast alert, Console log hay payload API. Client chỉ xử lý mã băm SHA-256 (`adminEmailHash`).
4. **CẤM ghi đè node gốc `shared_dishes` khi thêm món lẻ**: Thêm món dùng `addDishCloud(dish)` (`shared_dishes/${dish.id}`); xóa món dùng `deleteDishCloud(dishId)`. Ghi đè toàn bộ sẽ bị Firebase chặn `Permission Denied`.
5. **CẤM tự ý seed dữ liệu lên Cloud**: Khi Cloud rỗng, khách mở web chỉ xem dữ liệu mẫu cục bộ (chế độ chỉ đọc). Chỉ Admin đã xác thực Google mới có quyền khôi phục dữ liệu lên Cloud.
6. **CẤM tự ý thay đổi chức năng hoặc luồng nghiệp vụ hiện có**:
   - Nghiêm cấm mọi hành vi tự ý sửa đổi, thêm bớt, gỡ bỏ hoặc làm sai lệch hành vi của bất kỳ tính năng nào đã hoàn thiện (Vòng quay Canvas 60fps, bộ lọc Sáng/Trưa/Tối, lọc giá, lọc chay, lọc nước/khô, hàng đợi duyệt món `pending_dishes`, cờ ngắt ghi khẩn cấp Kill Switch `writesEnabled`, cơ chế Local-First, bảo mật headers, khử trùng XSS, Bảng điều khiển Quản trị `/#/admin`...) nếu **KHÔNG có yêu cầu hoặc xác nhận rõ ràng bằng lệnh trực tiếp từ người dùng trong chat**.
   - Mọi hoạt động Clean Code / Refactoring bắt buộc phải bảo toàn 100% chức năng hiện có và vượt qua toàn bộ bộ kiểm thử hồi quy hệ thống (`npm run test:regression`).

---

## 3. Các Việc Bắt Buộc Phải Hỏi Trước (Ask Before Action)
Phải hỏi và nhận được xác nhận từ người dùng trước khi thực hiện các hành động sau:
- Mọi thao tác Git phá hủy: `filter-branch`, `filter-repo`, `rebase`, `reset --hard`, `force push`, xóa nhánh/tag.
- Mọi thao tác ghi lên dữ liệu Firebase PRODUCTION (kể cả script kiểm thử). Kiểm thử Rules chỉ dùng Firebase Emulator.
- Chạy lệnh `firebase deploy` hoặc deploy production.
- Chỉnh sửa file [`database.rules.json`](file:///d:/Practice/random-ai/database.rules.json).
- Xóa, thay đổi hoặc migrate dữ liệu hàng loạt trên Firebase Cloud.
- Thêm mới, gỡ bỏ hoặc thay đổi phiên bản dependencies trong [`package.json`](file:///d:/Practice/random-ai/package.json).
- Thay đổi cấu trúc Schema của món ăn (`Dish`).
- Thay đổi cơ chế xác thực Admin Google Sign-In hoặc thuật toán băm bảo mật SHA-256.
- Tái cấu trúc hoặc xóa các module cốt lõi: [`WheelCanvas.tsx`](file:///d:/Practice/random-ai/src/components/WheelCanvas.tsx), [`storage.js`](file:///d:/Practice/random-ai/src/services/storage.js), [`firebase.js`](file:///d:/Practice/random-ai/src/services/firebase.js).

---

## 4. Lệnh Kiểm Thử Bắt Buộc & Báo Cáo Bàn Giao (Pre-flight & Report)
Trước khi bàn giao, agent bắt buộc phải chạy các lệnh kiểm thử sau (dùng `cmd.exe /c` trên Windows):

```powershell
cmd.exe /c "npm test"                  # Đảm bảo toàn bộ Unit & Integration Tests PASS (>= 178 tests)
cmd.exe /c "npm run test:regression"   # Đảm bảo 100% Regression Tests PASS (Bảo toàn chức năng)
cmd.exe /c "npx tsc --noEmit"         # Không có bất kỳ lỗi TypeScript nào
cmd.exe /c "npm run build"            # Build production Vite thành công
```

**Quy chuẩn báo cáo bàn giao**:
- Agent phải ghi rõ **kết quả kiểm thử thực tế** (số lượng pass/fail cụ thể từ console output).
- Nếu lệnh kiểm thử không chạy được (ví dụ do lỗi môi trường hoặc thiếu quyền), phải báo cáo trung thực nguyên nhân; **tuyệt đối không ghi "đã xác nhận / đã pass" khi chưa thực sự chạy lệnh**.

---

> 📖 **Đọc [PROJECT_RULES.md](file:///d:/Practice/random-ai/PROJECT_RULES.md) để nắm kiến trúc chi tiết, cơ chế đồng bộ Cloud/Local và ví dụ code chuẩn.**
