const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

const productDetail = document.getElementById('productDetail');
const ratingSummary = document.getElementById('ratingSummary');
const reviewList = document.getElementById('reviewList');
const reviewFormContainer = document.getElementById('reviewFormContainer');
const loginPrompt = document.getElementById('loginPrompt');
const reviewForm = document.getElementById('reviewForm');

// Kiểm tra trạng thái đăng nhập
function checkLoginForReview() {
    // Tự động điền tên tài khoản đăng nhập vào ô Họ tên giao hàng
    const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && currentUser.name) {
    const nameInput = document.getElementById('customerName'); // hoặc ID ô nhập tên của bạn
        if (nameInput) nameInput.value = currentUser.name;
}   
    const token = localStorage.getItem('token');
    if (token) {
        if (reviewFormContainer) reviewFormContainer.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        if (reviewFormContainer) reviewFormContainer.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

// Tải thông tin chi tiết sản phẩm và bình luận
async function loadProductDetail() {
    if (!productId) {
        productDetail.innerHTML = '<p>Không tìm thấy mã sản phẩm!</p>';
        return;
    }

    try {
        const res = await fetch(`/api/products/${productId}`);
        const result = await res.json();

        if (result.success) {
            const p = result.data;

            // Render thông tin sản phẩm
            productDetail.innerHTML = `
                <div style="display: flex; gap: 30px; margin-top: 20px;">
                    <img src="${p.image || 'https://via.placeholder.com/300'}" style="width: 350px; height: 350px; object-fit: cover; border-radius: 8px;" alt="${p.name}">
                    <div>
                        <h1>${p.name}</h1>
                        <p style="font-size: 24px; color: #e44d26; font-weight: bold;">${p.price.toLocaleString('vi-VN')} VNĐ</p>
                        <p><strong>Tồn kho:</strong> ${p.stock}</p>
                        <p><strong>Mô tả:</strong> ${p.description || 'Chưa có mô tả'}</p>
                    </div>
                </div>
            `;

            // Render tổng quan sao đánh giá
            const avg = p.averageRating || 0;
            const count = p.numReviews || 0;
            ratingSummary.innerHTML = `⭐ <strong>${avg} / 5</strong> (${count} lượt đánh giá thực tế)`;

            // Render danh sách bình luận
            renderReviews(p.reviews || []);
        }
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
    }
}

// Hiển thị danh sách bình luận
function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        reviewList.innerHTML = '<p style="color: #777;">Chưa có bình luận nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>';
        return;
    }

    // Sắp xếp bình luận mới nhất lên đầu
    const sortedReviews = [...reviews].reverse();

    let html = '';
    sortedReviews.forEach(r => {
        const stars = '⭐'.repeat(r.rating);
        const date = new Date(r.createdAt).toLocaleDateString('vi-VN');

        html += `
            <div class="review-item">
                <div>
                    <span class="author">${r.userName}</span>
                    <span class="stars">${stars}</span>
                    <span class="date"> - ${date}</span>
                </div>
                <div class="comment-text">${r.comment}</div>
            </div>
        `;
    });

    reviewList.innerHTML = html;
}

// Xử lý Gửi Đánh Giá Mới
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            alert('🔒 Vui lòng đăng nhập để gửi bình luận!');
            return;
        }

        const rating = document.getElementById('reviewRating').value;
        const comment = document.getElementById('reviewComment').value;

        try {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comment })
            });

            const result = await res.json();

            if (result.success) {
                alert(result.message);
                reviewForm.reset();
                loadProductDetail(); // Tải lại để cập nhật số sao & bình luận mới
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error('Lỗi khi gửi bình luận:', err);
        }
    });
}

// Khởi chạy
checkLoginForReview();
loadProductDetail();