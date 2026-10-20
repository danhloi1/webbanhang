const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // VD: SUMMER2026
    discountPercent: { type: Number, default: 0 }, // Giảm theo % (VD: 10 = 10%)
    discountAmount: { type: Number, default: 0 }, // Giảm theo số tiền cố định (VD: 50000 = 50.000 VNĐ)
    minOrderValue: { type: Number, default: 0 }, // Giá trị đơn hàng tối thiểu để áp dụng
    usageLimit: { type: Number, default: 100 }, // Số lượt dùng tối đa
    usedCount: { type: Number, default: 0 }, // Số lượt đã dùng
    isActive: { type: Boolean, default: true }, // Trạng thái kích hoạt
    expirationDate: { type: Date } // Ngày hết hạn
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);