# 🏛️ RANDOM FOOD — TÀI LIỆU KIẾN TRÚC & QUY TẮC KỸ THUẬT

> **Mục tiêu**: Đảm bảo toàn bộ tính năng đang hoạt động (Vòng quay 60fps, Realtime Cloud Sync, Phân quyền Admin, Lịch sử 14 ngày, Đánh giá, Lọc món) **KHÔNG BAO GIỜ BỊ HỎNG HOẶC SUY GIẢM HIỆU NĂNG (REGRESSION)** khi bảo trì, thêm tính năng hay tái cấu trúc.

---

## 1. SƠ ĐỒ KIẾN TRÚC & MÔ HÌNH DỮ LIỆU (DATA TOPOLOGY)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (BROWSER / PWA)                         │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │    Dữ Liệu Dùng Chung   │  │       Dữ Liệu Riêng (Private)       │  │
│  │ (Thực đơn shared_dishes)│  │ (Yêu thích, Lịch sử quay, Bộ lọc)   │  │
│  │  ► Local đóng vai Cache │  │  ► Local-First 100% trên thiết bị   │  │
│  └────────────┬────────────┘  └─────────────────────────────────────┘  │
│               │ (Offline Queue / Realtime Sync)                        │
└───────────────┼────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE CLOUD BACKEND                          │
│                                                                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Realtime DB (Singapore)       │  │        Authentication       │  │
│  │   /shared_dishes/$id            │  │  - Anonymous Auth (Khách)   │  │
│  │     status: 'pending'|'approved'│  │  - Google Sign-In (Admin 👑)│  │
│  │     createdBy: uid              │  └─────────────────────────────┘  │
│  │   /shared_dishes/$id/reviews/$uid  ┌─────────────────────────────┐  │
│  │   /reports/$reportId            │  │          App Check          │  │
│  │   ► NGUỒN CHÂN LÝ (Source)      │  │  reCAPTCHA Enterprise / v3  │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NGUYÊN TẮC ĐỒNG BỘ DỮ LIỆU & BẢO MẬT (CORE ARCHITECTURE)

### 📌 Nguyên Tắc 1: Phân Định Nguồn Chân Lý (Source of Truth vs. Local Cache)
- **Quy tắc**:
  - **Thực đơn dùng chung (`shared_dishes`)**: Cloud là **Nguồn Chân Lý duy nhất**. `LocalStorage` chỉ đóng vai trò bộ nhớ đệm (Cache) ngoại tuyến để hiển thị tức thì khi chưa có mạng.
  - **Dữ liệu riêng tư**: Món yêu thích (`favorites`), lịch sử quay (`spinHistory`), và tùy chọn bộ lọc cá nhân là **Local-First 100%**, chỉ lưu trữ trên thiết bị của người dùng, không đồng bộ lên Cloud công khai.
  - **Món bị xóa trên Cloud**: Khi lắng nghe Realtime (`onValue`) phát hiện một món đã bị xóa khỏi Cloud, Client phải lập tức cập nhật cache LocalStorage (gỡ bỏ món đó). **TUYỆT ĐỐI CẤM** việc Client tự động lấy danh sách cache trong LocalStorage đẩy ngược lên Cloud, gây hiện tượng "hồi sinh" món rác đã bị Admin xóa.
- **Lý do gốc**: Tránh xung đột dữ liệu giữa nhiều người dùng và đảm bảo quyền kiểm duyệt tối cao của Quản trị viên trên Cloud.
- **Ví dụ code**:
  - ❌ **Sai**:
    ```javascript
    // Khi Cloud trả về danh sách, thấy Local có món mà Cloud thiếu liền đẩy ngược lên Cloud
    const missingOnCloud = localDishes.filter(l => !cloudDishes.some(c => c.id === l.id));
    if (missingOnCloud.length > 0) saveDishesCloud([...cloudDishes, ...missingOnCloud]);
    ```
  - ✅ **Đúng**:
    ```javascript
    // Đồng bộ 1 chiều: Cập nhật cache Local khớp hoàn toàn với Cloud
    saveDishesLocally(cloudDishes);
    setDishes(cloudDishes);
    ```

---

### 📌 Nguyên Tắc 2: Xử Lý Khi Mất Mạng (Offline Retry Queue)
- **Quy tắc**:
  - Khi người dùng tạo món hoặc gửi đánh giá trong lúc mất mạng, thao tác phải được ghi ngay vào hàng đợi cục bộ (ví dụ: `pending_cloud_mutations` trong `LocalStorage`).
  - Giao diện phản hồi thành công ngay lập tức (Optimistic UI) kèm thông báo nhẹ "Đã lưu cục bộ, sẽ tự đồng bộ khi có mạng".
  - Khi trình duyệt có mạng trở lại (`window.addEventListener('online')`), hệ thống tự động duyệt hàng đợi để đồng bộ tuần tự lên Firebase.
- **Lý do gốc**: Đảm bảo trải nghiệm PWA mượt mà, không làm mất công sức nhập liệu của người dùng dù đang đi thang máy hay mất sóng di động.
- **Ví dụ code**:
  - ❌ **Sai**:
    ```javascript
    if (!navigator.onLine) {
      showToast("Không có mạng, không thể thêm món!", "error");
      return;
    }
    ```
  - ✅ **Đúng**:
    ```javascript
    saveDishesLocally([...localDishes, newDish]);
    if (!navigator.onLine) {
      queueMutation({ type: 'ADD_DISH', payload: newDish });
      showToast("Đã lưu ngoại tuyến. Sẽ tự động tải lên khi có mạng! 📶", "info");
    } else {
      addDishCloud(newDish);
    }
    ```

---

### 📌 Nguyên Tắc 3: Phân Quyền Sửa/Xóa & Quy Trình Duyệt Món (Pending Workflow)
- **Quy tắc**:
  - **Quyền sở hữu (`createdBy`)**: Mỗi món ăn khi tạo mới phải gắn với `createdBy: auth.uid` (UID của tài khoản Anonymous hoặc Google).
  - **Quyền sửa/xóa**: Khách chỉ được phép chỉnh sửa món do chính mình tạo (`auth.uid === data.child('createdBy').val()`); không được sửa/xóa món của người khác. Chỉ Quản trị viên mới có quyền xóa bất kỳ món nào.
  - **Quy trình kiểm duyệt (`status`)**:
    - Khách vãng lai tạo món mới **bắt buộc** có `status: 'pending'`.
    - Chỉ tài khoản Google Quản trị viên (`isCurrentUserAdmin() === true`) mới có quyền chuyển `status` sang `'approved'`.
    - Vòng quay của công chúng mặc định chỉ hiển thị các món đã được duyệt (`status === 'approved'`).
- **Lý do gốc**: Tránh người dùng xấu spam hoặc chèn nội dung phản cảm, độc hại lên vòng quay của cộng đồng mà không qua kiểm duyệt.
- **Ví dụ code**:
  - ❌ **Sai**:
    ```javascript
    // Khách tạo món tự ý gán status: 'approved'
    const newDish = { ...formValues, status: 'approved' };
    ```
  - ✅ **Đúng**:
    ```javascript
    // Khách chỉ được tạo món pending kèm UID người tạo
    const newDish = {
      ...formValues,
      status: isCurrentUserAdmin() ? 'approved' : 'pending',
      createdBy: currentUser?.uid || 'anonymous',
      createdAt: Date.now()
    };
    ```

---

### 📌 Nguyên Tắc 4: Ràng Buộc Xác Thực Dữ Liệu Trong Firebase Rules (`.validate`)
- **Quy tắc**:
  File [`database.rules.json`](file:///d:/Practice/random-ai/database.rules.json) phải cấu hình các ràng buộc `.validate` nghiêm ngặt:
  1. **Trường bắt buộc**: Node món mới phải có đủ: `name`, `mealTypes`, `status`, `createdAt`, `createdBy`.
  2. **Ràng buộc Status**: 
     - Khi tạo mới: Món của khách bắt buộc có `newData.child('status').val() === 'pending'`.
     - Ngoại lệ: Chỉ Admin mới có quyền tạo món trực tiếp với `'approved'` hoặc sửa `status`.
  3. **Ràng buộc Người tạo**: `newData.child('createdBy').val() === auth.uid`.
- **Lý do gốc**: Client-side validation có thể bị vượt qua bằng Postman/curl hoặc console injection; do đó Firebase Security Rules là phòng tuyến bảo mật cuối cùng bắt buộc phải có.
- **Đặc tả cấu trúc Rule mẫu**:
  ```json
  "$dishId": {
    ".read": true,
    ".write": "(!data.exists() && auth != null) || (data.exists() && (auth.uid === data.child('createdBy').val() || auth.token.email.toLowerCase() === '<admin_email>'))",
    ".validate": "newData.hasChildren(['name', 'mealTypes', 'status', 'createdAt', 'createdBy'])",
    "status": {
      ".validate": "newData.val() === 'pending' || (auth != null && auth.token.email.toLowerCase() === '<admin_email>')"
    },
    "createdBy": {
      ".validate": "!data.exists() ? newData.val() === auth.uid : newData.val() === data.val()"
    }
  }
  ```

---

### 📌 Nguyên Tắc 5: Xử Lý Khi Cloud Rỗng & Người Dùng Khách (Empty Cloud Fallback)
- **Quy tắc**:
  - Khi kết nối Firebase và phát hiện node `shared_dishes` trên Cloud hoàn toàn rỗng (`null` hoặc `{}`):
    - **Nếu là Khách vãng lai**: Client nạp danh sách thực đơn mặc định (`DEFAULT_DISHES_HCM`) vào bộ nhớ tạm để hiển thị cho khách chơi ở **chế độ CHỈ ĐỌC (Read-Only)**.
    - **TUYỆT ĐỐI CẤM** việc client tự động kích hoạt `saveDishesCloud()` để đẩy dữ liệu mẫu lên Cloud.
    - Chỉ tài khoản Quản trị viên (đã xác thực Google) mới thấy nút bấm thủ công và có quyền chạy tính năng *"Khôi phục thực đơn gốc lên Cloud"*.
- **Lý do gốc**: Tránh lãng phí lượt ghi cơ sở dữ liệu và bảo đảm chỉ Admin mới có quyền định hình dữ liệu gốc cho toàn bộ hệ thống.
- **Ví dụ code**:
  - ❌ **Sai**:
    ```javascript
    // Tự động seed dữ liệu lên Cloud khi khách mở web thấy dữ liệu rỗng -> Bị chặn Permission Denied!
    if (!cloudDishes || Object.keys(cloudDishes).length === 0) {
      saveDishesCloud(DEFAULT_DISHES_HCM);
    }
    ```
  - ✅ **Đúng**:
    ```javascript
    if (!cloudDishes || Object.keys(cloudDishes).length === 0) {
      // Khách vãng lai chỉ dùng dữ liệu mẫu cục bộ, không ghi Cloud
      const fallbackDishes = DEFAULT_DISHES_HCM.map(normalizeDish);
      setDishes(fallbackDishes);
      if (isCurrentUserAdmin()) {
        showToast("Cloud đang rỗng. Bạn có thể nhấn 'Khôi phục mẫu gốc' trong Admin", "info");
      }
    }
    ```

---

### 📌 Nguyên Tắc 6: Zero-Knowledge Privacy & Client Admin Check (Bảo Mật Danh Tính)
- **Quy tắc**:
  - Tuyệt đối không in email cá nhân, biến `ADMIN_EMAIL` hay khóa bí mật vào giao diện UI, thông báo Toast, Console log hay payload API.
  - Phía Client chỉ nhận mã băm SHA-256 một chiều (`adminEmailHash`) từ API `/api/config`.
  - Phân quyền Admin ở client chỉ so sánh: `hashString(currentUser.email) === adminEmailHash`.
  - Khi người dùng đăng nhập tài khoản Google không phải Admin, chỉ hiển thị thông báo trung tính: *"Tài khoản Google này không có quyền Quản trị viên."*
- **Lý do gốc**: Tránh rò rỉ thông tin cá nhân và tài khoản quản trị khi inspect client code hoặc reverse engineering.

---

### 📌 Nguyên Tắc 7: Tương Thích Ngược Dữ Liệu Cũ (Soft Migration & Fallback Handling)
- **Quy tắc**:
  - Mọi dữ liệu món nạp vào State phải chạy qua hàm [`normalizeDish(dish)`](file:///d:/Practice/random-ai/src/services/storage.js#L69-L137) (chuẩn hóa `status: 'approved'`, `type`, `vegetarian`, `priceRange`, `tags`).
  - Xử lý phòng thủ:
    - `mealTypes`: Fallback nếu dữ liệu cũ chỉ có chuỗi đơn lẻ `dish.meal`.
    - `locations`: Fallback nếu dữ liệu cũ là mảng chuỗi string thay vì mảng object `{ name, address }`.
- **Lý do gốc**: Dữ liệu lịch sử của người dùng hoặc dữ liệu cũ trên Cloud thiếu các thuộc tính mới; nếu truy cập trực tiếp sẽ gây crash runtime (màn hình trắng).

---

### 📌 Nguyên Tắc 8: Vòng Đời Modal Độc Lập & Tránh Stale State
- **Quy tắc**:
  - Các modal đọc dữ liệu từ Storage (như [`HistoryModal.tsx`](file:///d:/Practice/random-ai/src/components/HistoryModal.tsx), [`AdminModal.tsx`](file:///d:/Practice/random-ai/src/components/AdminModal.tsx)) **bắt buộc dùng `useEffect([isOpen])`** để tự động nạp lại dữ liệu mới nhất từ Storage khi modal được mở.
  - [`ResultModal.tsx`](file:///d:/Practice/random-ai/src/components/ResultModal.tsx) nhận dữ liệu từ props và phân tách rạch ròi 2 chế độ:
    - `mode="spin"`: Chúc mừng quay trúng, Confetti, nút "Quay lại món khác".
    - `mode="detail"`: Xem thông tin quán từ danh sách món, tiêu đề "Thông Tin & Địa Điểm Quán", nút đóng, KHÔNG có pháo hoa và KHÔNG có nút quay lại.
- **Lý do gốc**: Khởi tạo state một lần duy nhất qua `useState(getSpinHistory())` khi mount component sẽ lưu trữ dữ liệu cũ (stale data).

---

### 📌 Nguyên Tắc 9: Hiệu Năng Vòng Quay Canvas 2D 60fps & Offscreen Buffer
- **Quy tắc**:
  - Sử dụng **Offscreen Canvas Buffer** (`bufferCanvasRef`): Nan quạt, phân màu và chữ uốn cong chỉ vẽ **1 lần duy nhất** vào bộ nhớ đệm Buffer khi danh sách món hoặc kích thước thay đổi.
  - Trong vòng lặp xoay `requestAnimationFrame` (60fps), hàm `draw()` chỉ thực hiện xoay hệ trục tọa độ và vẽ lại ảnh đệm qua `ctx.drawImage(buffer, -r, -r)` trong thời gian `< 0.05ms`.
  - **Kích thước Canvas**: Luôn đo theo khung chứa ngoài cùng cố định (`containerRef`), kích thước chuẩn desktop là **400px**. Tuyệt đối không đo theo thẻ cha có CSS `display: flex` co dãn (shrink-wrap) để tránh bị kẹt ở kích thước fallback 300px.
- **Lý do gốc**: Tính toán vector chữ cong trên nan quạt tốn 10–15ms mỗi frame; nếu vẽ trực tiếp trong vòng lặp 60fps sẽ giật lag nghiêm trọng trên thiết bị di động.

---

### 📌 Nguyên Tắc 10: Lịch Sử Quay & Cơ Chế Tránh Lặp Món (14 Ngày)
- **Quy tắc**:
  - Sau khi kết thúc vòng quay, món trúng phải được ghi nhận ngay vào lịch sử qua hàm `recordSpinHistory(dish, currentMeal)`.
  - Hàm [`filterDishes`](file:///d:/Practice/random-ai/src/utils/filterLogic.js) tiếp nhận danh sách `recentlyEatenIds` lấy từ `getRecentlyEatenDishIds(avoidDays)` (1–3 ngày) để loại trừ các món đã ăn gần đây ra khỏi vòng quay.
- **Lý do gốc**: Giữ đúng cam kết tính năng "Hôm nay ăn gì không bị trùng", đảm bảo người dùng có trải nghiệm đổi món mỗi ngày.

---

## 3. CHECKLIST NGHIỆM THU TÍNH NĂNG (ACCEPTANCE MATRIX)

| Thành phần | Tiêu chí nghiệm thu bắt buộc |
|---|---|
| **Vòng quay (Wheel)** | Kích thước chuẩn 400px desktop, co giãn 100% mobile; xoay 60fps bằng Offscreen Buffer; dừng chuẩn tâm kim chỉ. |
| **Bảo mật Admin** | Không lộ email cá nhân hay biến `ADMIN_EMAIL`. Chỉ tài khoản Google đúng email mới mở khóa Xóa / Khôi phục. |
| **Thêm món mới** | Khách bình thường tạo món với `status: 'pending'`; lưu LocalStorage và node `shared_dishes/$dishId` trên Cloud. |
| **Lịch sử & Tránh lặp** | Quay xong lưu ngay lịch sử 14 ngày; bật tránh lặp 1–3 ngày tự động ẩn các món đã ăn khỏi danh sách quay. |
| **Xem chi tiết quán** | Bấm vào card món ở danh sách hiển thị đúng địa chỉ, GPS "Tìm quán gần tôi", không có chữ "Vũ trụ đã chọn bạn". |
| **Kiểm thử tự động** | Vượt qua 100% bộ 22/22 Unit Tests (`cmd.exe /c "npm test"`), TypeCheck sạch sẽ và Build thành công. |
