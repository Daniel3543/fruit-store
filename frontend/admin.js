const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
let token = localStorage.getItem('adminToken');

// Check authentication
function checkAuth() {
    if (token) {
        document.getElementById('loginForm').style.display = 'none';
        loadDashboard();
    } else {
        document.getElementById('loginForm').style.display = 'block';
    }
}

// Login
async function login() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('adminToken', token);
            document.getElementById('loginForm').style.display = 'none';
            loadDashboard();
        } else {
            alert('Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка при входе');
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const ordersResponse = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await ordersResponse.json();
        
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size;
        const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(0);
        document.getElementById('uniqueCustomers').textContent = uniqueCustomers;
        document.getElementById('avgOrder').textContent = avgOrder.toFixed(0);
        
        loadProducts();
        loadOrders();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const products = await response.json();
        
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = products.map(product => `
            <tr>
                <td><img src="${product.image_url || 'https://via.placeholder.com/50'}" width="50" height="50" style="object-fit: cover;"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.price} AMD</td>
                <td>${product.unit}</td>
                <td><span class="status-badge ${product.active ? 'status-completed' : 'status-cancelled'}">${product.active ? 'Активен' : 'Неактивен'}</span></td>
                <td>
                    <button onclick="editProduct(${product.id})" class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${product.id})" class="delete-btn"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await response.json();
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td>${order.customer_name}</td>
                <td>${order.customer_phone}</td>
                <td>${order.total} AMD</td>
                <td>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" class="status-select">
                        <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Ожидает</option>
                        <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>В обработке</option>
                        <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Выполнен</option>
                        <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                    </select>
                </td>
                <td>
                    <button onclick="viewOrderDetails(${order.id})" class="view-btn"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Add product
function addProduct() {
    document.getElementById('productModalTitle').textContent = 'Добавить товар';
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').style.display = 'flex';
}

// Edit product
window.editProduct = async function(id) {
    try {
        const response = await fetch(`${API_URL}/products/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const products = await response.json();
        const product = products.find(p => p.id === id);
        
        document.getElementById('productModalTitle').textContent = 'Редактировать товар';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productUnit').value = product.unit;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productActive').checked = product.active;
        
        if (product.image_url) {
            document.getElementById('currentImage').innerHTML = `<img src="${product.image_url}" width="100"><br>Текущее изображение`;
        }
        
        document.getElementById('productModal').style.display = 'flex';
    } catch (error) {
        console.error('Error editing product:', error);
    }
};

// Delete product
window.deleteProduct = async function(id) {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
        try {
            await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadProducts();
            alert('Товар удален');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Ошибка при удалении');
        }
    }
};

// Save product
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const id = document.getElementById('productId').value;
    
    formData.append('name', document.getElementById('productName').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('unit', document.getElementById('productUnit').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('active', document.getElementById('productActive').checked);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (response.ok) {
            document.getElementById('productModal').style.display = 'none';
            loadProducts();
            alert(id ? 'Товар обновлен' : 'Товар добавлен');
        } else {
            alert('Ошибка при сохранении');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Ошибка при сохранении');
    }
});

// Update order status
window.updateOrderStatus = async function(id, status) {
    try {
        await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        loadOrders();
    } catch (error) {
        console.error('Error updating order:', error);
    }
};

// Load statistics
async function loadStatistics() {
    const period = document.getElementById('statsPeriod').value;
    
    try {
        const response = await fetch(`${API_URL}/statistics?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        document.getElementById('statsTotalOrders').textContent = data.summary.total_orders || 0;
        document.getElementById('statsTotalRevenue').textContent = (data.summary.total_revenue || 0).toFixed(0) + ' AMD';
        document.getElementById('statsAvgOrder').textContent = (data.summary.average_order_value || 0).toFixed(0) + ' AMD';
        
        const topProductsList = document.getElementById('topProductsList');
        topProductsList.innerHTML = data.top_products.map(product => `
            <div class="top-product-item">
                <strong>${product.product_name}</strong>
                <span>Заказано: ${product.total_quantity} ${product.unit || 'шт'}</span>
                <span>Раз: ${product.times_ordered}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Calculate accounting
async function calculateAccounting() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await response.json();
        
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.order_date);
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });
        
        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
        const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_phone)).size;
        
        document.getElementById('reportPeriod').textContent = `${startDate} - ${endDate}`;
        document.getElementById('accountingTotalOrders').textContent = totalOrders;
        document.getElementById('accountingTotalRevenue').textContent = totalRevenue.toFixed(0);
        document.getElementById('accountingAvgOrder').textContent = avgOrder.toFixed(0);
        document.getElementById('accountingUniqueCustomers').textContent = uniqueCustomers;
        
        // Daily breakdown
        const dailyBreakdown = {};
        filteredOrders.forEach(order => {
            const date = new Date(order.order_date).toLocaleDateString();
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = { orders: 0, revenue: 0 };
            }
            dailyBreakdown[date].orders++;
            dailyBreakdown[date].revenue += order.total;
        });
        
        const dailyBreakdownDiv = document.getElementById('dailyBreakdown');
        dailyBreakdownDiv.innerHTML = Object.entries(dailyBreakdown).map(([date, data]) => `
            <div class="daily-item">
                <strong>${date}</strong>
                <span>Заказов: ${data.orders}</span>
                <span>Выручка: ${data.revenue.toFixed(0)} AMD</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error calculating accounting:', error);
    }
}

// Export report
function exportReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период');
        return;
    }
    
    const reportData = {
        period: `${startDate} - ${endDate}`,
        totalOrders: document.getElementById('accountingTotalOrders').textContent,
        totalRevenue: document.getElementById('accountingTotalRevenue').textContent,
        avgOrder: document.getElementById('accountingAvgOrder').textContent,
        uniqueCustomers: document.getElementById('accountingUniqueCustomers').textContent,
        exportDate: new Date().toLocaleString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${startDate}_${endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'statistics') {
            loadStatistics();
        } else if (tabId === 'accounting') {
            // Set default dates
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
            document.getElementById('endDate').value = today.toISOString().split('T')[0];
        }
    });
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    token = null;
    document.getElementById('loginForm').style.display = 'block';
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('dashboard').classList.add('active');
});

// Event listeners
document.getElementById('adminLoginBtn')?.addEventListener('click', login);
document.getElementById('addProductBtn')?.addEventListener('click', addProduct);
document.getElementById('loadStatsBtn')?.addEventListener('click', loadStatistics);
document.getElementById('calculateAccountingBtn')?.addEventListener('click', calculateAccounting);
document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'none';
    });
});

// Initialize
checkAuth();