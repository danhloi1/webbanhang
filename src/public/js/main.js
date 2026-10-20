let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
// 1. Lắng nghe khi trang web vừa tải xong
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(); // Gọi hàm tải sản phẩm
    // Các hàm khởi tạo khác của bạn...
});

// 2. Định nghĩa hàm loadProducts
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();

        // Xử lý lấy danh sách mảng sản phẩm
        let products = [];
        if (Array.isArray(data)) {
            products = data;
        } else if (data.data && Array.isArray(data.data)) {
            products = data.data;
        }

        // GÁN BẮT BUỘC VÀO BIẾN TOÀN CỤC
        window.allProducts = products;

        // Hiển thị sản phẩm ra màn hình
        renderProducts(products);
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
    }
}

// 2. Kiểm tra trạng thái đăng nhập
function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const btnOpenLogin = document.getElementById('btnOpenLogin');
    const btnOpenRegister = document.getElementById('btnOpenRegister');
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const custNameInput = document.getElementById('custName');
    const adminLink = document.getElementById('adminLink');

    if (user) {
        if (btnOpenLogin) btnOpenLogin.style.display = 'none';
        if (btnOpenRegister) btnOpenRegister.style.display = 'none';
        if (userInfo) userInfo.style.display = 'inline';
        if (userNameDisplay) userNameDisplay.innerText = user.name;
        if (custNameInput) custNameInput.value = user.name;

        if (adminLink) {
            adminLink.style.display = user.role === 'admin' ? 'inline' : 'none';
        }
    } else {
        if (btnOpenLogin) btnOpenLogin.style.display = 'inline';
        if (btnOpenRegister) btnOpenRegister.style.display = 'inline';
        if (userInfo) userInfo.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

// 3. Tải danh sách sản phẩm
// Hàm tải sản phẩm từ API
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        
        if (result.success || Array.isArray(result)) {
            const products = result.data || result;
            window.allProducts = products; // GÁN BIẾN TOÀN CỤC BẮT BUỘC
            renderProducts(products);
        }
    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
    }
}

// 4. Hiển thị Card Sản Phẩm
// Render Danh Sách Sản Phẩm
function renderProducts(products) {
    const productList = document.getElementById('productList');
    if (!productList) return;

    if (!products || products.length === 0) {
        productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Chưa có sản phẩm nào!</p>';
        return;
    }

    let html = '';
    products.forEach(p => {
        const isLiked = typeof wishlist !== 'undefined' && wishlist.some(item => item._id === p._id);
        const heartIcon = isLiked ? '❤️' : '🤍';

        // Kiểm tra số lượng tồn kho
        const isOutOfStock = p.stock <= 0;
        
        const stockBadge = isOutOfStock 
            ? '<span style="background: #ef4444; color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Hết hàng</span>' 
            : `<span style="color: #64748b; font-size: 12px;">Kho: <b>${p.stock}</b></span>`;

        // Nếu hết hàng -> Khóa nút bấm
        const btnAddCart = isOutOfStock
            ? `<button class="btn-add-cart" disabled style="background: #94a3b8 !important; cursor: not-allowed; opacity: 0.7;">🚫 Hết Hàng</button>`
            : `<button class="btn-add-cart" onclick="addToCart('${p._id}', '${p.name}', ${p.price})">🛒 Thêm Vào Giỏ</button>`;

        html += `
            <div class="product-card" style="${isOutOfStock ? 'opacity: 0.85;' : ''}">
                <button class="btn-wishlist" onclick="toggleWishlist('${p._id}')" title="Thêm vào yêu thích">
                    ${heartIcon}
                </button>
                <div>
                    <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}">
                    <h3>${p.name}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="price">${p.price.toLocaleString('vi-VN')} VNĐ</div>
                        <div>${stockBadge}</div>
                    </div>
                </div>
                <div class="btn-group">
                    ${btnAddCart}
                    <button class="btn-detail" onclick="goToProductDetail('${p._id}')">👁️ Xem Chi Tiết</button>
                </div>
            </div>
        `;
    });

    productList.innerHTML = html;
    if (typeof updateWishlistCount === 'function') updateWishlistCount();
}

// Chuyển hướng xem chi tiết
function goToProductDetail(id) {
    window.location.href = `/product?id=${id}`;
}

// 5. Tìm kiếm & Lọc sản phẩm
// Hàm Lọc Đa Năng (Tìm kiếm + Danh mục + Thương hiệu + Sắp xếp)
function filterProducts() {
    if (!window.allProducts) return;

    const keyword = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const selectedCategory = document.getElementById('filterCategory')?.value || 'ALL';
    const selectedBrand = document.getElementById('filterBrand')?.value || 'ALL';
    const sortType = document.getElementById('sortSelect')?.value || 'default';

    let filtered = window.allProducts.filter(p => {
        // 1. Kiểm tra Từ khóa tìm kiếm
        const matchKeyword = p.name.toLowerCase().includes(keyword) || 
                             (p.description && p.description.toLowerCase().includes(keyword));

        // 2. Kiểm tra Danh mục
        const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

        // 3. Kiểm tra Thương hiệu
        const matchBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;

        return matchKeyword && matchCategory && matchBrand;
    });

    // 4. Sắp xếp giá
    if (sortType === 'asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortType === 'desc') {
        filtered.sort((a, b) => b.price - a.price);
    }

    // Hiển thị kết quả lọc ra giao diện
    renderProducts(filtered);
}

// Thêm vào giỏ hàng
function addToCart(id, name, price) {
    const product = window.allProducts ? window.allProducts.find(p => p._id === id) : null;
    const maxStock = product ? product.stock : 0;

    if (maxStock <= 0) {
        alert('⚠️ Sản phẩm này hiện tại đã hết hàng!');
        return;
    }

    const existingIndex = cart.findIndex(item => item.id === id || item.productId === id);
    
    if (existingIndex > -1) {
        if (cart[existingIndex].quantity + 1 > maxStock) {
            alert(`⚠️ Sản phẩm này chỉ còn ${maxStock} cái trong kho, bạn không thể thêm vượt quá số lượng tồn kho!`);
            return;
        }
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ id, productId: id, name, price, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    alert(`🎉 Đã thêm "${name}" vào giỏ hàng!`);
}

// 7. Render Giỏ Hàng Mới (Dùng class 'btn-remove-item' và icon thùng rác 🗑️)
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    if (!cartItems) return;

    let total = 0;
    let totalCount = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart-msg">Giỏ hàng của bạn đang trống.</p>';
        if (cartCount) cartCount.innerText = '0';
        if (cartTotal) cartTotal.innerText = '0 VNĐ';
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        totalCount += item.quantity;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString('vi-VN')} VNĐ x <strong>${item.quantity}</strong></div>
                </div>
                <button class="btn-remove-item" onclick="removeFromCart(${index})" title="Xóa khỏi giỏ">🗑️</button>
            </div>
        `;
    });

    cartItems.innerHTML = html;
    if (cartCount) cartCount.innerText = totalCount;
    if (cartTotal) cartTotal.innerText = total.toLocaleString('vi-VN') + ' VNĐ';
}

// Xóa khỏi giỏ hàng
function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}



// Xử lý Đặt hàng (Bổ sung tính tiền sau giảm giá từ Voucher)
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            alert('⚠️ Giỏ hàng đang trống!');
            return;
        }

        const customerName = document.getElementById('custName').value.trim();
        const customerPhone = document.getElementById('custPhone').value.trim();
        const customerAddress = document.getElementById('custAddress').value.trim();
        const paymentMethod = document.getElementById('paymentMethod') ? document.getElementById('paymentMethod').value : 'COD';

        // TÍNH TOÁN TỔNG TIỀN SAU KHU TRỪ VOUCHER
        const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const totalAmount = Math.max(0, subTotal - currentDiscount);

        const orderData = {
            customerName,
            customerPhone,
            customerAddress,
            paymentMethod,
            voucherCode: appliedVoucherCode,
            discountAmount: currentDiscount,
            items: cart.map(i => ({
                productId: i.productId || i.id,
                name: i.name,
                price: i.price,
                quantity: i.quantity
            })),
            totalAmount
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const result = await res.json();
            if (result.success) {
                const order = result.data;
                
                // Nếu chọn VietQR -> Mở Modal VietQR
                if (paymentMethod === 'BANK_QR' && typeof showQrModal === 'function') {
                    showQrModal(order);
                } else {
                    alert('🎉 Đặt hàng thành công! Cảm ơn bạn đã mua hàng.');
                    clearCartAndReset();
                }
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error('Lỗi đặt hàng:', err);
        }
    });
}

// Hàm dọn dẹp giỏ hàng sau khi đặt thành công
function clearCartAndReset() {
    cart = [];
    currentDiscount = 0;
    appliedVoucherCode = '';
    localStorage.removeItem('cart');
    renderCart();
    if (checkoutForm) checkoutForm.reset();
    if (document.getElementById('voucherInput')) document.getElementById('voucherInput').value = '';
    checkAuthStatus();
}

// Hàm hiển thị Popup VietQR Động
function showQrModal(order) {
    // Thông tin tài khoản ngân hàng nhận tiền (Bạn có thể thay bằng số tk thực của bạn)
    const BANK_ID = 'MB'; // Tên viết tắt ngân hàng (MB, VCB, TCB, ACB, VPB...)
    const ACCOUNT_NO = '0987654321'; // Số tài khoản nhận tiền
    const ACCOUNT_NAME = 'CUAHANGCONGNGHE'; // Tên chủ tài khoản

    const memo = `HD${order._id.slice(-6)}`; // Nội dung CK ngắn gọn
    const amount = order.totalAmount;

    // API tạo mã VietQR chuẩn quy định Ngân Hàng Nhà Nước
    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    document.getElementById('qrCodeImg').src = qrUrl;
    document.getElementById('qrOrderId').innerText = order._id;
    document.getElementById('qrAmount').innerText = amount.toLocaleString('vi-VN') + ' VNĐ';
    document.getElementById('qrMemo').innerText = memo;

    document.getElementById('qrModal').style.display = 'block';
}

function finishQrPayment() {
    alert('🎉 Cảm ơn bạn! Đơn hàng đã được lưu. Hệ thống sẽ xác nhận thanh toán và giao hàng sớm nhất.');
    closeModal('qrModal');
    clearCartAndReset();
}

function clearCartAndReset() {
    cart = [];
    localStorage.removeItem('cart');
    renderCart();
    if (checkoutForm) checkoutForm.reset();
    checkAuthStatus();
}

// 9. Quản lý Modal & Bật/Tắt xem Mật khẩu
function openAuthModal(type) {
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!authModal) return;

    authModal.style.display = 'block';
    if (type === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'none';
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    alert('👋 Bạn đã đăng xuất.');
    window.location.reload();
}

function togglePasswordVisibility(inputId, iconSpan) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        iconSpan.innerText = '🙈';
    } else {
        passwordInput.type = 'password';
        iconSpan.innerText = '👁️';
    }
}

function openForgotPasswordModal() {
    closeAuthModal();
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'block';
}

function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Form Đăng nhập
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await res.json();
            if (result.success) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                alert('🎉 Đăng nhập thành công!');
                closeAuthModal();
                checkAuthStatus();
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error('Lỗi đăng nhập:', err);
        }
    });
}

// Form Đăng ký
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await res.json();
            if (result.success) {
                alert('🎉 Đăng ký thành công! Hãy đăng nhập.');
                registerForm.reset();
                openAuthModal('login');
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error('Lỗi đăng ký:', err);
        }
    });
}

// Form Quên mật khẩu
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        const newPassword = document.getElementById('forgotNewPassword').value.trim();

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword })
            });

            const result = await res.json();
            if (result.success) {
                alert(result.message);
                closeModal('forgotPasswordModal');
                forgotPasswordForm.reset();
                openAuthModal('login');
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
}

// Form Đổi mật khẩu
const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert('🔒 Vui lòng đăng nhập!');
            return;
        }

        const oldPassword = document.getElementById('oldPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const result = await res.json();
            if (result.success) {
                alert(result.message);
                closeModal('changePasswordModal');
                changePasswordForm.reset();
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
}
let currentDiscount = 0;
let appliedVoucherCode = '';

// Hàm áp dụng mã giảm giá
async function applyVoucher() {
    const code = document.getElementById('voucherInput')?.value.trim();
    if (!code) {
        alert('⚠️ Vui lòng nhập mã giảm giá!');
        return;
    }

    const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (subTotal === 0) {
        alert('⚠️ Giỏ hàng đang trống!');
        return;
    }

    try {
        const res = await fetch('/api/vouchers/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, orderTotal: subTotal })
        });

        const result = await res.json();
        if (result.success) {
            currentDiscount = result.discount;
            appliedVoucherCode = result.voucherCode;
            alert(`🎉 ${result.message} Bạn được giảm ${result.discount.toLocaleString('vi-VN')} VNĐ`);
            renderCart();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (err) {
        console.error('Lỗi áp dụng voucher:', err);
    }
}

// ================= VOUCHER & TÍNH TIỀN GIẢM =================

// Hàm kiểm tra và áp dụng Mã Giảm Giá
async function applyVoucher() {
    const code = document.getElementById('voucherInput')?.value.trim();
    if (!code) {
        alert('⚠️ Vui lòng nhập mã giảm giá!');
        return;
    }

    const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (subTotal === 0) {
        alert('⚠️ Giỏ hàng đang trống!');
        return;
    }

    try {
        const res = await fetch('/api/vouchers/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, orderTotal: subTotal })
        });

        const result = await res.json();
        if (result.success) {
            currentDiscount = result.discount;
            appliedVoucherCode = result.voucherCode;
            alert(`🎉 ${result.message} Bạn được giảm ${result.discount.toLocaleString('vi-VN')} VNĐ`);
            renderCart();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (err) {
        console.error('Lỗi áp dụng voucher:', err);
    }
}

// Cập nhật lại hàm renderCart() để tính toán tiền giảm giá
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const discountText = document.getElementById('discountAmountText');

    if (!cartItems) return;

    let subTotal = 0;
    let totalCount = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart-msg">Giỏ hàng của bạn đang trống.</p>';
        if (cartCount) cartCount.innerText = '0';
        if (cartTotal) cartTotal.innerText = '0 VNĐ';
        if (discountText) discountText.innerText = '0 VNĐ';
        currentDiscount = 0;
        appliedVoucherCode = '';
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subTotal += itemTotal;
        totalCount += item.quantity;

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString('vi-VN')} VNĐ x <strong>${item.quantity}</strong></div>
                </div>
                <button class="btn-remove-item" onclick="removeFromCart(${index})" title="Xóa khỏi giỏ">🗑️</button>
            </div>
        `;
    });

    const finalTotal = Math.max(0, subTotal - currentDiscount);

    cartItems.innerHTML = html;
    if (cartCount) cartCount.innerText = totalCount;
    if (discountText) discountText.innerText = `- ${currentDiscount.toLocaleString('vi-VN')} VNĐ`;
    if (cartTotal) cartTotal.innerText = finalTotal.toLocaleString('vi-VN') + ' VNĐ';
}
// ================= XỬ LÝ LỊCH SỬ ĐƠN HÀNG CỦA KHÁCH =================

// 1. Mở Modal Lịch Sử Đơn Hàng
async function openMyOrdersModal() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('🔒 Vui lòng đăng nhập để xem lịch sử đơn hàng!');
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('myOrdersModal');
    if (modal) modal.style.display = 'block';

    await fetchMyOrders();
}

// 2. Lấy dữ liệu đơn hàng từ API
async function fetchMyOrders() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('myOrdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">⏳ Đang tải đơn hàng...</td></tr>';

    try {
        const res = await fetch('/api/orders/my-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await res.json();
        if (result.success) {
            renderMyOrdersTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">❌ ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error('Lỗi lấy danh sách đơn hàng:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">❌ Không thể kết nối đến máy chủ!</td></tr>';
    }
}

// 3. Render bảng danh sách đơn hàng

function renderMyOrdersTable(orders) {
    const tbody = document.getElementById('myOrdersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Bạn chưa có đơn hàng nào!</td></tr>';
        return;
    }

    const statusBadgeMap = {
        'Pending': '<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:6px; font-weight:bold;">Chờ xử lý</span>',
        'Cancel_Requested': '<span style="background:#fed7aa; color:#c2410c; padding:4px 8px; border-radius:6px; font-weight:bold;">Chờ Admin duyệt hủy</span>',
        'Shipping': '<span style="background:#e0f2fe; color:#0284c7; padding:4px 8px; border-radius:6px; font-weight:bold;">Đang giao</span>',
        'Completed': '<span style="background:#dcfce7; color:#16a34a; padding:4px 8px; border-radius:6px; font-weight:bold;">Đã hoàn thành</span>',
        'Cancelled': '<span style="background:#fee2e2; color:#dc2626; padding:4px 8px; border-radius:6px; font-weight:bold;">Đã hủy</span>'
    };

    tbody.innerHTML = ''; // Xóa sạch nội dung cũ

    orders.forEach(o => {
        const itemsList = o.items ? o.items.map(i => `• ${i.name} (x${i.quantity})`).join('<br>') : '';
        const isCancelable = o.status === 'Pending';
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';

        tr.innerHTML = `
            <td style="padding: 10px;"><small style="color:#64748b;">${o._id ? o._id.slice(-6) : ''}</small></td>
            <td style="padding: 10px; line-height: 1.4;">${itemsList}</td>
            <td style="padding: 10px; font-weight: bold; color: #ef4444;">${o.totalAmount ? o.totalAmount.toLocaleString('vi-VN') : 0} VNĐ</td>
            <td style="padding: 10px;">${statusBadgeMap[o.status] || o.status}</td>
            <td style="padding: 10px;" class="action-cell"></td>
        `;

        const actionCell = tr.querySelector('.action-cell');
        if (isCancelable) {
            const btnCancel = document.createElement('button');
            btnCancel.innerText = '❌ Yêu Cầu Hủy';
            btnCancel.style.cssText = 'background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;';
            
            // Gán sự kiện trực tiếp với đúng ID thực sự
            btnCancel.addEventListener('click', () => {
                cancelMyOrder(o._id);
            });
            actionCell.appendChild(btnCancel);
        } else {
            actionCell.innerHTML = '<small style="color:#94a3b8;">N/A</small>';
        }

        tbody.appendChild(tr);
    });
}

async function cancelMyOrder(orderId) {
    if (!confirm('⚠️ Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });

        const result = await res.json();
        if (result.success) {
            alert('🎉 Hủy đơn hàng thành công!');
            await fetchMyOrders(); // Tải lại danh sách đơn hàng
        } else {
            alert('❌ ' + result.message);
        }
    } catch (err) {
        console.error('Lỗi hủy đơn hàng:', err);
    }
}
// ================= XỬ LÝ DANH SÁCH YÊU THÍCH (WISHLIST) =================

// 1. Cập nhật số lượng Wishlist trên Header
function updateWishlistCount() {
    const countSpan = document.getElementById('wishlistCount');
    if (countSpan) countSpan.innerText = wishlist.length;
}

// 2. Thêm / Xóa sản phẩm khỏi Wishlist khi bấm trái tim
function toggleWishlist(productId) {
    if (!window.allProducts) return;

    const index = wishlist.findIndex(item => item._id === productId);
    if (index > -1) {
        wishlist.splice(index, 1); // Đã có -> Xóa khỏi Wishlist
    } else {
        const product = window.allProducts.find(p => p._id === productId);
        if (product) wishlist.push(product); // Chưa có -> Thêm vào Wishlist
    }

    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    renderProducts(window.allProducts); // Render lại để cập nhật icon trái tim
    if (document.getElementById('wishlistModal')?.style.display === 'block') {
        renderWishlistModal(); // Cập nhật lại Modal nếu đang mở
    }
}

// 3. Mở Modal Danh Sách Yêu Thích
function openWishlistModal() {
    const modal = document.getElementById('wishlistModal');
    if (modal) {
        modal.style.display = 'block';
        renderWishlistModal();
    }
}

// 4. Render sản phẩm bên trong Modal Wishlist
function renderWishlistModal() {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;

    if (wishlist.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 20px;">Danh sách yêu thích đang trống!</p>';
        return;
    }

    let html = '';
    wishlist.forEach(p => {
        html += `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; position: relative;">
                <button onclick="toggleWishlist('${p._id}')" style="position: absolute; top: 5px; right: 5px; background: none; border: none; cursor: pointer; font-size: 16px;" title="Xóa khỏi yêu thích">❌</button>
                <img src="${p.image || 'https://via.placeholder.com/100'}" alt="${p.name}" style="width: 100%; height: 100px; object-fit: contain; margin-bottom: 8px;">
                <h4 style="font-size: 13px; color: #1e293b; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</h4>
                <div style="color: #ef4444; font-weight: bold; font-size: 13px; margin-bottom: 8px;">${p.price.toLocaleString('vi-VN')} VNĐ</div>
                <button onclick="addToCart('${p._id}', '${p.name}', ${p.price})" style="width: 100%; background: #2563eb; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold;">🛒 Thêm Vào Giỏ</button>
            </div>
        `;
    });

    container.innerHTML = html;
}
// ================= XỬ LÝ DARK / LIGHT MODE =================

// 1. Tự động kiểm tra và áp dụng theme đã lưu khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

// 2. Chuyển đổi giữa chế độ Sáng và Tối
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

// 3. Cập nhật Icon và Chữ trên nút bấm
function updateThemeUI(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (!themeIcon || !themeText) return;

    if (theme === 'dark') {
        themeIcon.innerText = '☀️';
        themeText.innerText = 'Chế độ sáng';
    } else {
        themeIcon.innerText = '🌙';
        themeText.innerText = 'Chế độ tối';
    }
}
// Thêm vào giỏ hàng (Kiểm tra giới hạn Stock)
function addToCart(id, name, price, maxStock) {
    const existingIndex = cart.findIndex(item => item.id === id || item.productId === id);
    
    if (existingIndex > -1) {
        if (cart[existingIndex].quantity + 1 > maxStock) {
            alert(`⚠️ Sản phẩm này chỉ còn ${maxStock} cái trong kho, bạn không thể thêm vượt quá số lượng tồn kho!`);
            return;
        }
        cart[existingIndex].quantity += 1;
    } else {
        if (1 > maxStock) {
            alert('⚠️ Sản phẩm này hiện tại đã hết hàng!');
            return;
        }
        cart.push({ id, productId: id, name, price, quantity: 1, maxStock });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    alert(`🎉 Đã thêm "${name}" vào giỏ hàng!`);
}
// ================= HÀM LỌC ĐA NĂNG (XỬ LÝ LỖI handleFilter) =================
// ================= HÀM LỌC & SẮP XẾP CHUẨN AN TOÀN =================
function handleFilter() {
    if (!window.allProducts || !Array.isArray(window.allProducts)) return;

    const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const selectedCategory = (document.getElementById('filterCategory')?.value || 'ALL').trim();
    const selectedBrand = (document.getElementById('filterBrand')?.value || 'ALL').trim();
    const sortType = document.getElementById('sortSelect')?.value || 'default';

    let filtered = window.allProducts.filter(p => {
        // Lọc từ khóa
        const pName = (p.name || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const matchKeyword = !keyword || pName.includes(keyword) || pDesc.includes(keyword);

        // Lọc Danh mục
        const pCat = (p.category || '').toLowerCase().trim();
        const matchCategory = (selectedCategory === 'ALL') || (pCat === selectedCategory.toLowerCase());

        // Lọc Thương hiệu
        const pBrand = (p.brand || '').toLowerCase().trim();
        const matchBrand = (selectedBrand === 'ALL') || (pBrand === selectedBrand.toLowerCase());

        return matchKeyword && matchCategory && matchBrand;
    });

    // Sắp xếp
    let sortedProducts = [...filtered];
    if (sortType === 'price-asc' || sortType === 'asc') {
        sortedProducts.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortType === 'price-desc' || sortType === 'desc') {
        sortedProducts.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortType === 'name-asc') {
        sortedProducts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));
    }

    renderProducts(sortedProducts);
}