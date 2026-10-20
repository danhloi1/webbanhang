const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập họ tên']
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);