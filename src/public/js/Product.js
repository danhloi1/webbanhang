const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    stock: { type: Number, default: 10 },
    description: { type: String },
    // 📌 Bổ sung 2 trường phân loại
    category: { type: String, default: 'Chưa phân loại' }, // Ví dụ: Bàn phím, Chuột, Tai nghe, Màn hình
    brand: { type: String, default: 'Khác' }               // Ví dụ: Logitech, Razer, Mchose, Asus
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);