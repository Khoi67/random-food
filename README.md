# Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay May Mắn Ẩm Thực Sài Gòn 🍜

Ứng dụng web giải quyết câu hỏi muôn thuở **"Hôm nay ăn gì?"** tại Thành phố Hồ Chí Minh. Được tối ưu theo phong cách **Mobile-First**, giao diện Dark Theme hiện đại kết hợp vòng quay may mắn có trọng số, bộ lọc thông minh, tính năng quán gần tôi, chia sẻ kết quả và đồng bộ đám mây Realtime.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

- **Frontend Core**: React 19, TypeScript, Canvas API (vẽ vòng quay tương tác), Lucide React icons.
- **Build Tool**: [Vite](https://vitejs.dev/) - Tối ưu build cực nhanh, hỗ trợ Hot Module Replacement (HMR).
- **Styling**: Tailwind CSS với theme Dark Mode cao cấp (`slate-950`), WCAG AA compliant.
- **Backend / Realtime**: [Firebase Realtime Database](https://firebase.google.com/) (Modular SDK v13) & Firebase Anonymous Auth.
- **PWA (Progressive Web App)**: Service Worker cache offline, Web App Manifest, cho phép cài đặt lên màn hình chính (A2HS).
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics) (không thu thập thông tin định danh cá nhân - Zero PII).
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert/strict`).

---

## 💻 1. Hướng Dẫn Chạy Ở Local (Local Development)

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node.js v20+ hoặc v22+).
- **Trình quản lý gói**: `npm` đi kèm Node.js.

### Các Bước Cài Đặt & Chạy
```bash
# 1. Clone repository về máy
git clone https://github.com/Khoi67/random-food.git
cd random-food

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển (Vite Dev Server)
npm run dev

# 4. Chạy kiểm thử tự động (Unit Test)
npm test

# 5. Build kiểm tra bản Production
npm run build
```

Sau khi chạy `npm run dev`, mở trình duyệt truy cập: `http://localhost:5173/`

---

## 🔑 2. Biến Môi Trường Cần Thiết (Environment Variables)

Ứng dụng sử dụng Serverless Endpoint `/api/config.js` trên Vercel để bảo vệ các API Key của Firebase và phục vụ cho client với bộ nhớ đệm Edge Cache (24h).

### Danh Sách Biến Môi Trường (Vercel & Local)
Tạo file `.env.local` (nếu chạy Serverless với Vercel CLI) hoặc cấu hình trong **Vercel Project Settings ➔ Environment Variables**:

| Tên Biến | Ý Nghĩa / Mục Đích | Bắt Buộc? | Ví Dụ |
| :--- | :--- | :---: | :--- |
| `FIREBASE_API_KEY` | Web API Key của dự án Firebase | **Có** | `AIzaSyD-xxx...` |
| `FIREBASE_AUTH_DOMAIN` | Tên miền xác thực Firebase | **Có** | `random-food-hcm.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | URL kết nối Realtime Database | **Có** | `https://random-food-hcm-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `FIREBASE_PROJECT_ID` | Project ID trên Firebase Console | **Có** | `random-food-hcm` |
| `FIREBASE_STORAGE_BUCKET` | Storage Bucket của Firebase | Không | `random-food-hcm.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | ID gửi thông báo | Không | `123456789012` |
| `FIREBASE_APP_ID` | Application ID của Web App | **Có** | `1:123456789012:web:abcdef123456` |
| `ADMIN_PIN` | Mã PIN mặc định cho quyền Quản trị viên | Tùy chọn | `123456` |

> 💡 **Cơ chế Fallback an toàn:**
> Nếu không cấu hình các biến môi trường này, ứng dụng sẽ chạy ở chế độ **Local-First (Ngoại tuyến 🛡️)**. Dữ liệu thực đơn, lịch sử 14 ngày và món yêu thích vẫn được lưu trữ đầy đủ trong `localStorage` trên máy người dùng.

---

## 🔥 3. Hướng Dẫn Cấu Hình Firebase (Realtime Database & Auth)

Chỉ cần 3 bước đơn giản trên [Firebase Console](https://console.firebase.google.com/):

### Bước 1: Tạo Project & Web App
1. Truy cập [Firebase Console](https://console.firebase.google.com/) ➔ Bấm **Add project** (Đặt tên ví dụ `random-food-hcm`).
2. Tắt Google Analytics (nếu muốn tối giản) ➔ Bấm **Create project**.
3. Tại trang tổng quan, bấm vào biểu tượng Web `</>` để tạo App ➔ Đặt nickname và lưu lại mã cấu hình `firebaseConfig`.

### Bước 2: Kích hoạt Realtime Database
1. Ở menu bên trái, chọn **Build ➔ Realtime Database** ➔ Bấm **Create Database**.
2. Chọn vị trí máy chủ gần Việt Nam nhất: **Singapore (`asia-southeast1`)**.
3. Tại tab **Rules**, dán đoạn cấu hình phân quyền bên dưới và bấm **Publish**:

```json
{
  "rules": {
    "shared_dishes": {
      ".read": true,
      ".write": true
    },
    "admin_config": {
      ".read": true,
      ".write": true
    },
    "reviews": {
      ".read": true,
      ".write": true
    },
    "reports": {
      ".read": true,
      ".write": true
    }
  }
}
```

### Bước 3: Bật Anonymous Authentication (Khuyến nghị)
1. Chọn **Build ➔ Authentication** ➔ Tab **Sign-in method**.
2. Bật nhà cung cấp **Anonymous (Ẩn danh)** ➔ Bấm **Save**. Điều này cho phép người dùng đọc/ghi dữ liệu an toàn mà không cần tạo tài khoản.

---

## ☁️ 4. Hướng Dẫn Deploy Lên Vercel

Dự án được tối ưu hóa 100% để triển khai tự động lên Vercel:

### Cách 1: Deploy qua Giao Diện Web Vercel (Khuyên dùng)
1. Đẩy code lên GitHub repository:
   ```bash
   git push origin main
   ```
2. Truy cập [Vercel Dashboard](https://vercel.com/) ➔ Bấm **Add New... ➔ Project**.
3. Chọn repo `random-food` (hoặc `random-ai`) từ tài khoản GitHub của bạn.
4. Kiểm tra cấu hình Build:
   - **Framework Preset**: `Vite` (Vercel tự động nhận diện).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Trong mục **Environment Variables**, thêm đầy đủ các biến môi trường Firebase đã liệt kê ở Mục 2.
6. Bấm **Deploy**. Vercel sẽ tự động build và cấp domain HTTPS miễn phí.

### Cách 2: Deploy qua Vercel CLI
```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Đăng nhập và deploy
vercel --prod
```

---

## 🧪 5. Kiểm Thử Tự Động (Unit Testing)

Bộ kiểm thử được viết bằng module chuẩn `node:test` và `node:assert/strict` của Node.js:
- **Kiểm thử bộ lọc (`filterDishes`)**: Lọc theo bữa ăn, trạng thái kiểm duyệt, món tạm loại hôm nay, món tránh lặp lại trong N ngày gần nhất, khoảng giá, kiểu nước/khô, món chay.
- **Kiểm thử vòng quay có trọng số (`computeWeightedSlices`, `pickWeightedWinner`)**: Xác nhận món Yêu thích nhận trọng số 2x, tính toán góc phân bổ chuẩn $2\pi$, chọn kết quả xác định (deterministic) và phân phối xác suất thống kê thực tế.

Chạy lệnh test:
```bash
npm test
```
Kết quả mong đợi: `pass 13, fail 0` trong ~250ms.

---

## 📱 6. PWA & Cài Đặt Lên Màn Hình Chính

- **Máy tính (Chrome, Edge)**: Bấm vào biểu tượng Cài đặt trên thanh địa chỉ hoặc mở menu `⋯` ➔ chọn **"Cài đặt ứng dụng"**.
- **Điện thoại Android**: Thông báo "Thêm vào Màn hình chính" xuất hiện tự động hoặc bấm nút tải trên thanh điều hướng.
- **Điện thoại iPhone / iPad (Safari)**: Bấm nút **Chia sẻ (Share)** ở đáy Safari ➔ Chọn **"Thêm vào MH chính" (Add to Home Screen)**.

---

## 📄 Bản Quyền & Giấy Phép
Dự án được phát hành dưới giấy phép mã nguồn mở ISC License.
Phát triển vì cộng đồng người yêu ẩm thực Sài Gòn! 🍲✨
