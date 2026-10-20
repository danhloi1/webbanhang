const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');

dotenv.config();

const sampleProducts = [
    { name: "Tai Nghe Bluetooth Pro", price: 500000, image: "https://picsum.photos/id/1/200/200" },
    { name: "Chuột Không Dây Gaming", price: 350000, image: "https://picsum.photos/id/160/200/200" },
    { name: "Bàn Phím Cơ RGB", price: 950000, image: "https://picsum.photos/id/201/200/200" },
    { name: "Màn Hình 24 inch Full HD", price: 2800000, image: "https://picsum.photos/id/3/200/200" },
    { name: "Loa Bluetooth Mini", price: 450000, image: "https://picsum.photos/id/10/200/200" },
    { name: "Webcam 1080p Cho Máy Tính", price: 600000, image: "https://picsum.photos/id/96/200/200" }
];

const importData = async () => {
    try {
        await connectDB();
        await Product.deleteMany(); // Xóa dữ liệu cũ nếu có
        await Product.insertMany(sampleProducts); // Thêm dữ liệu mẫu
        console.log('🎉 Nhập dữ liệu mẫu thành công!');
        process.exit();
    } catch (error) {
        console.error(`❌ Lỗi nhập dữ liệu: ${error.message}`);
        process.exit(1);
    }
};

importData();