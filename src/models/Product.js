const mongoose = require('mongoose');

// Schema cho từng bình luận/đánh giá
const reviewSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    // Các trường mới cho Review
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);