let myChart = null;

// 1. Hàm lấy Token đính kèm Header Authorization
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// 2. Chuyển đổi qua lại giữa các Tab
function switchTab(tabName) {
    const productTab = document.getElementById('product-management-section');
    const orderTab = document.getElementById('order-management-section');
    const btnProduct = document.getElementById('btn-tab-product');
    const btnOrder = document.getElementById('btn-tab-order');

    if (!productTab || !orderTab) return;

    if (tabName === 'products') {
        productTab.style.display = 'block';
        orderTab.style.display = 'none';
        if (btnProduct) btnProduct.className = 'btn btn-primary me-2 active';
        if (btnOrder) btnOrder.className = 'btn btn-outline-primary';
    } else if (tabName === 'orders') {
        productTab.style.display = 'none';
        orderTab.style.display = 'block';
        if (btnProduct) btnProduct.className = 'btn btn-outline-primary me-2';
        if (btnOrder) btnOrder.className = 'btn btn-primary active';
        fetchOrders();
    }
}

// ================= QUẢN LÝ SẢN PHẨM =================

// Tải danh sách sản phẩm
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        if (result.success) {
            renderProductsTable(result.data);
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách sản phẩm:', error);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('product-list-tbody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có sản phẩm nào.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image}" alt="${product.name}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;"></td>
            <td><strong>${product.name}</strong></td>
            <td class="text-danger fw-bold">${Number(product.price).toLocaleString('vi-VN')} VNĐ</td>
            <td><span class="badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'}">${product.stock}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editProduct('${product._id}')">Sửa</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">Xóa</button>
            </td>
        </tr>
    `).join('');
}

// Thêm / Chỉnh sửa Sản phẩm
async function handleProductFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const category = document.getElementById('prod-category').value;
    const brand = document.getElementById('prod-brand').value;
    const description = document.getElementById('prod-description').value;
    const fileInput = document.getElementById('prod-file');
    const imageUrlInput = document.getElementById('prod-image-url').value;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('category', category);
    formData.append('brand', brand);
    formData.append('description', description);

    if (fileInput.files[0]) {
        formData.append('imageFile', fileInput.files[0]);
    } else if (imageUrlInput) {
        formData.append('image', imageUrlInput);
    }

    const token = localStorage.getItem('token');
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message);
            resetProductForm();
            fetchProducts();
            fetchAnalytics();
        } else {
            alert('Lỗi: ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi lưu sản phẩm:', error);
    }
}

// Đưa dữ liệu sản phẩm lên Form để sửa
async function editProduct(id) {
    try {
        const response = await fetch(`/api/products/${id}`);
        const result = await response.json();

        if (result.success) {
            const p = result.data;
            document.getElementById('product-id').value = p._id;
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-price').value = p.price;
            document.getElementById('prod-stock').value = p.stock;
            document.getElementById('prod-category').value = p.category || 'Bàn phím';
            document.getElementById('prod-brand').value = p.brand || 'Logitech';
            document.getElementById('prod-description').value = p.description || '';
            document.getElementById('prod-image-url').value = p.image || '';

            document.getElementById('form-title').innerText = 'Chỉnh Sửa Sản Phẩm';
            document.getElementById('btn-cancel-edit').style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm:', error);
    }
}

// Xóa sản phẩm
async function deleteProduct(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message);
            fetchProducts();
            fetchAnalytics();
        } else {
            alert('Lỗi: ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi xóa sản phẩm:', error);
    }
}

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('form-title').innerText = 'Thêm Sản Phẩm Mới';
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

// ================= QUẢN LÝ ĐƠN HÀNG =================

// Tải danh sách đơn hàng
async function fetchOrders() {
    try {
        const response = await fetch('/api/orders', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            renderOrdersTable(result.data);
        } else {
            console.error('Lỗi lấy đơn hàng:', result.message);
        }
    } catch (error) {
        console.error('Lỗi tải đơn hàng:', error);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('order-list-tbody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có đơn hàng nào.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>#${order._id.slice(-6).toUpperCase()}</strong></td>
            <td><strong>${order.customerName || 'Khách'}</strong></td>
            <td>${order.customerPhone || 'N/A'}</td>
            <td><small>${order.customerAddress || 'N/A'}</small></td>
            <td class="text-primary fw-bold">${Number(order.totalAmount).toLocaleString('vi-VN')} VNĐ</td>
            <td class="text-center">
                <span class="badge ${order.isPaid ? 'bg-success' : 'bg-secondary'}" style="cursor:pointer;" onclick="togglePayment('${order._id}', ${!order.isPaid})">
                    ${order.isPaid ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                </span>
            </td>
            <td>
                <select class="form-select form-select-sm" onchange="updateOrderStatus('${order._id}', this.value)">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Chờ xử lý</option>
                    <option value="Cancel_Requested" ${order.status === 'Cancel_Requested' ? 'selected' : ''}>Yêu cầu hủy</option>
                    <option value="Shipping" ${order.status === 'Shipping' ? 'selected' : ''}>Đang giao</option>
                    <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Hoàn thành</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
                </select>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder('${order._id}')">Xóa</button>
            </td>
        </tr>
    `).join('');
}

// Cập nhật trạng thái đơn hàng
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        const result = await response.json();

        if (result.success) {
            fetchAnalytics(); // Cập nhật lại số liệu thống kê
        } else {
            alert('Lỗi: ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi đổi trạng thái đơn:', error);
    }
}

// Đổi trạng thái thanh toán
async function togglePayment(orderId, isPaid) {
    try {
        const response = await fetch(`/api/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ isPaid })
        });
        const result = await response.json();

        if (result.success) {
            fetchOrders();
        } else {
            alert('Lỗi: ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi đổi trạng thái thanh toán:', error);
    }
}

// Xóa đơn hàng (Nếu cần)
async function deleteOrder(orderId) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này khỏi hệ thống?')) return;
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            fetchOrders();
            fetchAnalytics();
        } else {
            // Nếu chưa có route DELETE /api/orders/:id thì báo thành công giả định trên giao diện
            fetchOrders();
        }
    } catch (error) {
        fetchOrders();
    }
}

// ================= THỐNG KÊ ANALYTICS =================

async function fetchAnalytics() {
    try {
        const response = await fetch('/api/admin/analytics', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            if (document.getElementById('total-revenue')) {
                document.getElementById('total-revenue').innerText = `${Number(data.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ`;
            }
            if (document.getElementById('completed-orders-count')) {
                document.getElementById('completed-orders-count').innerText = data.completedOrdersCount || 0;
            }
            if (document.getElementById('total-orders-count')) {
                document.getElementById('total-orders-count').innerText = data.totalOrders || 0;
            }
            if (document.getElementById('total-products-count')) {
                document.getElementById('total-products-count').innerText = data.totalProducts || 0;
            }

            renderChart(data.chartLabels, data.chartData);
        }
    } catch (error) {
        console.error('Lỗi tải thống kê:', error);
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (myChart !== null) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu 7 ngày (VNĐ)',
                data: data,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Real-time Socket.IO
if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('new_order_notification', (data) => {
        alert(`🎉 ${data.message}\nTổng tiền: ${Number(data.totalAmount).toLocaleString('vi-VN')} VNĐ`);
        fetchOrders();
        fetchAnalytics();
    });
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    fetchOrders();
    fetchAnalytics();
});