const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Shipping', 'Completed', 'Cancelled'] },
    // Bổ sung thông tin thanh toán
    paymentMethod: { type: String, default: 'COD', enum: ['COD', 'BANK_QR'] },
    isPaid: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);