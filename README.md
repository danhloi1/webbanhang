# 🛒 Website Bán Hàng Công Nghệ (Full-Stack Node.js E-Commerce)

Hệ thống e-commerce hoàn chỉnh tích hợp trang mua sắm dành cho Khách hàng và Trang quản trị (Admin Panel) với thông báo Real-time qua Socket.IO.

## 🚀 Tính Năng Chính

### 👤 Dành Cho Khách Hàng:
* **Trang chủ & Danh mục:** Tìm kiếm, lọc sản phẩm theo thương hiệu, phân trang linh hoạt.
* **Đặt hàng & Giỏ hàng:** Tích hợp mã giảm giá (Voucher), trừ tồn kho tự động, tạo mã VietQR thanh toán.
* **Tài khoản:** Đăng ký, đăng nhập JWT, đổi/quên mật khẩu, xem lịch sử đơn hàng & hủy đơn.
* **Đánh giá:** Gửi bình luận và chấm điểm số sao cho sản phẩm.

### 🛡️ Dành Cho Admin:
* **Báo cáo Analytics:** Biểu đồ doanh thu 7 ngày gần nhất (Chart.js), thống kê tổng đơn hàng, sản phẩm.
* **Quản lý sản phẩm:** Thêm, sửa, xóa sản phẩm kèm upload ảnh lên server (`Multer`).
* **Quản lý đơn hàng:** Cập nhật trạng thái giao hàng, trạng thái thanh toán.
* **Real-time Notification:** Nhận chuông và thông báo popup ngay lập tức khi có đơn hàng mới từ khách (`Socket.IO`).

## 🛠️ Công Nghệ Sử Dụng

* **Backend:** Node.js, Express.js, MongoDB / Mongoose, Socket.IO, JWT Auth, Multer, Bcrypt.js.
* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Chart.js.

## 🔧 Hướng Dẫn Cài Đặt Local

1. **Clone dự án về máy:**
   ```bash
   git clone [https://github.com/danhloi1/webbanhang.git](https://github.com/danhloi1/webbanhang.git)
   cd webbanhang