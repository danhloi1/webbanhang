const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');
const Voucher = require('./models/Voucher');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Lưu biến io vào app để dùng bắn thông báo Socket.IO
app.set('io', io);

// Lắng nghe kết nối Socket.IO
io.on('connection', (socket) => {
    console.log('⚡ Có người dùng kết nối Socket.IO:', socket.id);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Tự động kiểm tra và tạo thư mục uploads ở gốc dự án
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 2. Phục vụ tệp tĩnh (CSS, JS, Uploads)
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// 3. Cấu hình Multer lưu ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ================= MIDDLEWARE BẢO MẬT & PHÂN QUYỀN =================

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập!' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: '⛔ Truy cập bị từ chối! Bạn không có quyền Admin.' 
        });
    }
};

// ================= API QUẢN TRỊ ADMIN =================

// Upload ảnh sản phẩm
app.post('/api/upload', authMiddleware, adminMiddleware, upload.single('imageFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh!' });
        }
        res.json({
            success: true,
            message: 'Tải ảnh lên thành công!',
            imageUrl: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Thêm sản phẩm mới
app.post('/api/products', authMiddleware, adminMiddleware, upload.single('imageFile'), async (req, res) => {
    try {
        const { name, price, image, stock, description, category, brand } = req.body;
        let imageUrl = image;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const newProduct = new Product({
            name,
            price: Number(price),
            image: imageUrl || 'https://via.placeholder.com/200',
            stock: stock !== undefined ? Number(stock) : 10,
            description,
            category: category || 'Chưa phân loại',
            brand: brand || 'Khác'
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công!', data: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật sản phẩm
app.put('/api/products/:id', authMiddleware, adminMiddleware, upload.single('imageFile'), async (req, res) => {
    try {
        const { name, price, image, stock, description, category, brand } = req.body;
        let updateData = { 
            name, 
            price: Number(price), 
            stock: Number(stock), 
            description, 
            category, 
            brand 
        };

        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        } else if (image) {
            updateData.image = image;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedProduct) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công!', data: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa sản phẩm
app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        res.json({ success: true, message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật trạng thái đơn hàng (Admin)
app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Cancel_Requested', 'Shipping', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

        res.json({ success: true, message: 'Cập nhật trạng thái thành công!', data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật Trạng thái Thanh toán (Admin)
app.put('/api/orders/:id/payment', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { isPaid } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { isPaid }, { new: true });
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

        res.json({ success: true, message: 'Cập nhật trạng thái thanh toán thành công!', data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Thống kê & Báo cáo doanh thu (Admin Analytics)
app.get('/api/admin/analytics', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const completedOrders = await Order.find({ status: 'Completed' });

        const totalRevenue = completedOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentOrders = await Order.find({
            status: 'Completed',
            createdAt: { $gte: sevenDaysAgo }
        });

        const dailyRevenueMap = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            dailyRevenueMap[dateStr] = 0;
        }

        recentOrders.forEach(order => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            if (dailyRevenueMap[dateStr] !== undefined) {
                dailyRevenueMap[dateStr] += order.totalAmount;
            }
        });

        res.json({
            success: true,
            data: {
                totalProducts,
                totalOrders,
                completedOrdersCount: completedOrders.length,
                totalRevenue,
                chartLabels: Object.keys(dailyRevenueMap),
                chartData: Object.values(dailyRevenueMap)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= API CÔNG KHAI (PUBLIC API) =================

// Lấy danh sách sản phẩm (Hỗ trợ Phân trang)
app.get('/api/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);

        if (page && limit) {
            const skip = (page - 1) * limit;
            const totalProducts = await Product.countDocuments();
            const products = await Product.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

            return res.json({
                success: true,
                data: products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / limit),
                    totalProducts: totalProducts
                }
            });
        }

        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy chi tiết 1 sản phẩm
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đánh giá sản phẩm
app.post('/api/products/:id/reviews', authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5 ⭐!' });
        }

        const review = {
            userName: req.user.name || 'Khách hàng',
            rating: Number(rating),
            comment: (comment || '').trim()
        };

        if (!product.reviews) product.reviews = [];
        product.reviews.push(review);

        product.numReviews = product.reviews.length;
        const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
        product.averageRating = Number((totalRating / product.reviews.length).toFixed(1));

        await product.save();
        res.status(201).json({ success: true, message: '🎉 Đã gửi đánh giá thành công!', data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= API AUTHENTICATION =================

// Đăng ký
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email đã được sử dụng!' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, email, password: hashedPassword });
        res.status(201).json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác!' });

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Quên mật khẩu
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'Email chưa được đăng ký!' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: '🔑 Đặt lại mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đổi mật khẩu
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: '🔒 Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= API ĐƠN HÀNG (CUSTOMER) =================

// Tạo đơn hàng (Tự động trừ Stock & Bắn Socket.IO Real-time)
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, customerPhone, customerAddress, items, totalAmount, paymentMethod, voucherCode, discountAmount } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống!' });
        }

        // Kiểm tra tồn kho
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(400).json({ success: false, message: `Sản phẩm "${item.name}" không tồn tại!` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Sản phẩm "${item.name}" chỉ còn ${product.stock} trong kho!` 
                });
            }
        }

        // Trừ tồn kho
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        const newOrder = new Order({
            customerName,
            customerPhone,
            customerAddress,
            items,
            totalAmount,
            paymentMethod,
            voucherCode,
            discountAmount,
            status: 'Pending'
        });

        await newOrder.save();

        // 🔔 BẮN THÔNG BÁO REAL-TIME SỬ DỤNG SOCKET.IO
        const ioInstance = req.app.get('io');
        if (ioInstance) {
            ioInstance.emit('new_order_notification', {
                message: `📦 Đơn hàng mới từ ${customerName}!`,
                totalAmount: totalAmount,
                orderId: newOrder._id
            });
        }

        res.status(201).json({ success: true, message: 'Đặt hàng thành công!', order: newOrder, data: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy danh sách tất cả đơn hàng (Admin)
app.get('/api/orders', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy lịch sử đơn hàng cá nhân
app.get('/api/orders/my-orders', authMiddleware, async (req, res) => {
    try {
        const userName = req.user.name.trim();
        const orders = await Order.find({
            customerName: new RegExp(`^${userName}$`, 'i')
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Khách hàng gửi Yêu cầu Hủy đơn hàng (Cộng trả lại Stock)
app.put('/api/orders/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

        if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã bị hủy trước đó!' });
        }

        // Hoàn tồn kho
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        order.status = 'Cancel_Requested';
        await order.save();

        res.json({ success: true, message: 'Đã gửi yêu cầu hủy và hoàn tồn kho!', data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= API VOUCHER =================

app.post('/api/vouchers/apply', async (req, res) => {
    try {
        const { code, orderTotal } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá!' });

        const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true });
        if (!voucher) return res.status(404).json({ success: false, message: 'Mã giảm giá không hợp lệ!' });

        if (voucher.expirationDate && new Date() > new Date(voucher.expirationDate)) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn!' });
        }

        if (voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt dùng!' });
        }

        if (orderTotal < voucher.minOrderValue) {
            return res.status(400).json({ 
                success: false, 
                message: `Đơn hàng tối thiểu phải từ ${voucher.minOrderValue.toLocaleString('vi-VN')} VNĐ!` 
            });
        }

        let discount = 0;
        if (voucher.discountPercent > 0) {
            discount = (orderTotal * voucher.discountPercent) / 100;
        } else if (voucher.discountAmount > 0) {
            discount = voucher.discountAmount;
        }

        if (discount > orderTotal) discount = orderTotal;

        res.json({
            success: true,
            message: 'Áp dụng mã giảm giá thành công!',
            discount,
            voucherCode: voucher.code
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/vouchers', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { code, discountPercent, discountAmount, minOrderValue, usageLimit, expirationDate } = req.body;
        const existing = await Voucher.findOne({ code: code.toUpperCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Mã này đã tồn tại!' });

        const newVoucher = new Voucher({
            code,
            discountPercent: discountPercent || 0,
            discountAmount: discountAmount || 0,
            minOrderValue: minOrderValue || 0,
            usageLimit: usageLimit || 100,
            expirationDate: expirationDate || null
        });

        await newVoucher.save();
        res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công!', data: newVoucher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/vouchers', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= ROUTE TRẢ VỀ CÁC TRANG HTML GIAO DIỆN =================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'admin.html'));
});

app.get('/product', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'product.html'));
});

// ================= KHỞI CHẠY SERVER =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại địa chỉ: http://localhost:${PORT}`);
});