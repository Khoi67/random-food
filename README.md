# Hôm Nay Ăn Gì Ở TP.HCM? — Vòng Quay May Mắn Ẩm Thực Sài Gòn 🍜

Ứng dụng Progressive Web App (PWA) giải quyết câu hỏi muôn thuở **"Hôm nay ăn gì?"** tại Thành phố Hồ Chí Minh. Được tối ưu theo phong cách **Mobile-First**, giao diện Dark Theme hiện đại kết hợp vòng quay may mắn Canvas 2D mượt mà (60fps), bộ lọc thông minh theo bữa ăn Sài Gòn, tính năng chỉ đường quán gần tôi, lưu lịch sử ăn uống 14 ngày, đóng góp món cộng đồng và đồng bộ đám mây Realtime an toàn.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

- **Frontend Core**: React 19, TypeScript, Canvas API (Offscreen GPU Rendering Buffer), Lucide React icons.
- **Build Tool**: [Vite](https://vitejs.dev/) — Tối ưu hóa bundle và Hot Module Replacement (HMR) tức thì.
- **Styling**: Tailwind CSS với bảng màu Dark Mode cao cấp (`slate-950`), đạt chuẩn tương phản tiếp cận WCAG AA.
- **Backend / Realtime**: [Firebase Realtime Database](https://firebase.google.com/) (Modular SDK v13) & Firebase Anonymous / Google Auth.
- **Bảo Mật & An Ninh**:
  - OWASP Security Headers (nosniff, same-origin-allow-popups, HSTS, DENY iframe).
  - Content Security Policy (CSP Report-Only).
  - Rate limiting & Schema whitelist (`$other: false`) ở cấp cơ sở dữ liệu.
  - Mã hóa 1 chiều SHA-256 cho định danh Quản trị viên (`adminEmailHash`).
  - Cờ ngắt ghi khẩn cấp toàn hệ thống (**Kill Switch**) không cần redeploy.
  - Khử trùng XSS triệt để (Zero-eval, textContent DOM alerts, URL sanitizer).
- **PWA (Progressive Web App)**: Service Worker bộ nhớ đệm Offline, Web App Manifest, hỗ trợ cài đặt lên màn hình chính (A2HS).
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert/strict`) với hơn 170+ Unit & Full System Regression Tests.

---

## 💻 1. Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node.js v20+ hoặc v22+).
- **NPM**: Đi kèm với Node.js.

### Các Bước Cài Đặt
```bash
# 1. Clone mã nguồn về máy
git clone https://github.com/Khoi67/random-food.git
cd random-food

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển (Vite Dev Server)
npm run dev

# 4. Chạy toàn bộ kiểm thử tự động (Unit & Regression Tests)
npm test

# 5. Chạy riêng bộ kiểm thử hồi quy toàn diện hệ thống
npm run test:regression

# 6. Kiểm tra TypeScript và Build Production
npx tsc --noEmit
npm run build
```

Sau khi chạy `npm run dev`, mở trình duyệt và truy cập: `http://localhost:5173/`

---

## 🔑 2. Biến Môi Trường Cần Thiết (Environment Variables)

Ứng dụng phục vụ cấu hình Firebase thông qua Serverless Endpoint `/api/config.js` được tối ưu hóa bộ nhớ đệm Vercel Edge CDN (24h) và bảo vệ tuyệt đối thông tin nhạy cảm.

Cấu hình các biến sau trên **Vercel Project Settings ➔ Environment Variables** (hoặc file `.env.local` nếu dùng Vercel CLI):

| Tên Biến | Mục Đích | Bắt Buộc? | Ghi Chú Bảo Mật |
| :--- | :--- | :---: | :--- |
| `FIREBASE_API_KEY` | Web API Key của dự án Firebase | **Có** | Dùng cho Firebase Modular SDK |
| `FIREBASE_AUTH_DOMAIN` | Domain xác thực Firebase | **Có** | Ví dụ: `random-food-hcm.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | URL kết nối Realtime Database | **Có** | Khuyến nghị khu vực Singapore (`asia-southeast1`) |
| `FIREBASE_PROJECT_ID` | Project ID trên Firebase Console | **Có** | Ví dụ: `random-food-hcm` |
| `FIREBASE_STORAGE_BUCKET` | Storage Bucket | Không | Lưu trữ hình ảnh nếu có |
| `FIREBASE_MESSAGING_SENDER_ID` | ID gửi thông báo Cloud Messaging | Không | |
| `FIREBASE_APP_ID` | Application ID của Web App | **Có** | Ví dụ: `1:1234567890:web:...` |
| `FIREBASE_MEASUREMENT_ID` | Google Analytics ID | Không | Ví dụ: `G-XXXXXXXXXX` |
| `ADMIN_EMAIL` | Email Google của Quản trị viên | **Có** | **Được băm SHA-256 trước khi gửi về client, không bao giờ lộ email thô** |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA Site Key cho App Check | Không | Chống bot cào dữ liệu |
| `RECAPTCHA_TYPE` | Loại reCAPTCHA (`v3` hoặc `enterprise`)| Không | Mặc định: `v3` |

> 🛡️ **Kiến trúc Local-First & Fallback Ngoại Tuyến:**  
> Nếu chưa kết nối Firebase hoặc mất mạng, ứng dụng vẫn vận hành mượt mà ở chế độ ngoại tuyến. Thực đơn chuẩn 30 món Sài Gòn, lịch sử quay thưởng và danh sách món yêu thích luôn được lưu trữ an toàn trong `localStorage`.

---

## 🔥 3. Cấu Hình Cơ Sở Dữ Liệu (Firebase Realtime Database Rules)

Dự án sử dụng bộ quy tắc bảo mật được kiểm toán nghiêm ngặt tại [`database.rules.json`](./database.rules.json).

### Các nguyên tắc an ninh cốt lõi:
1. **Thực đơn dùng chung (`shared_dishes`)**: Công khai cho khách đọc (`.read: true`). Chỉ Quản trị viên đã xác thực Google mới có quyền ghi/sửa/xóa hoặc khôi phục dữ liệu mẫu.
2. **Hàng đợi món chờ duyệt (`pending_dishes`)**: Chỉ Admin mới đọc được. Khách gửi món mới sẽ được xếp vào hàng đợi chờ duyệt kèm rate limit (60s) và giới hạn schema (`$other: false`).
3. **Cờ ngắt ghi khẩn cấp (`config/writesEnabled` - Kill Switch)**: Cho phép Admin tạm dừng mọi thao tác gửi món, review và báo cáo của người dùng trên toàn hệ thống trong trường hợp bảo trì hoặc phát hiện tấn công spam.
4. **Đánh giá theo quán (`location_reviews`)**: Cô lập độc lập tại gốc, yêu cầu món ăn phải tồn tại trên thực đơn và giới hạn rate limit 20s.
5. **Nhật ký thao tác quản trị (`admin_audit_logs`)**: Thiết lập **APPEND-ONLY** (chỉ cho phép thêm, nghiêm cấm sửa hoặc xóa lịch sử).

Để cập nhật Rules, copy toàn bộ nội dung từ file [`database.rules.json`](./database.rules.json) và dán vào tab **Rules** của Realtime Database trên Firebase Console.

---

## 👑 4. Bảng Điều Khiển Quản Trị (Admin Dashboard MVP)

- Truy cập nhanh bằng định tuyến hash: `/#/admin` (hoặc click icon vương miện trên thanh tiêu đề khi đã đăng nhập Google bằng tài khoản quản trị).
- **Tính năng nổi bật:**
  - **Tổng quan chỉ số**: Thống kê số lượng món ăn theo từng bữa Sáng / Trưa / Tối tại TP.HCM, số lượng đánh giá và báo cáo vi phạm.
  - **Kill Switch trực quan**: Nút chuyển đổi trạng thái bảo trì hệ thống tức thời ngay trên thanh tiêu đề.
  - **Hàng đợi phê duyệt**: Xem xét món mới do cộng đồng đóng góp, phê duyệt đưa vào thực đơn hoặc từ chối.
  - **Kiểm duyệt đánh giá & Báo cáo vi phạm**: Xóa đánh giá spam và đóng các khiếu nại của người dùng.
  - **Khôi phục thực đơn gốc**: Nút khôi phục 30 món ăn đặc sản TP.HCM chỉ bằng một cú nhấp chuột.
  - **Nhật ký kiểm toán**: Theo dõi toàn bộ lịch sử thao tác của Admin theo thời gian thực.

---

## 🧪 5. Kiểm Thử & Đảm Bảo Chất Lượng (Quality Assurance)

Dự án áp dụng phương pháp kiểm thử tự động nghiêm ngặt không dùng công cụ giả lập không chính thống:

```bash
# Kiểm thử toàn diện mọi kịch bản (178/178 tests)
cmd.exe /c "npm test"

# Kiểm thử hồi quy hệ thống (Full System Regression Suite)
cmd.exe /c "npm run test:regression"

# Kiểm tra kiểu TypeScript (Strict Mode)
cmd.exe /c "npx tsc --noEmit"

# Kiểm tra quá trình đóng gói production
cmd.exe /c "npm run build"
```

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phân phối dưới giấy phép mã nguồn mở ISC License. Tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng ẩm thực Sài Gòn! 🇻🇳
