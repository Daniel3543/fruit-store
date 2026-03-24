const API_URL = 'https://fruit-store-backend-5ep0.onrender.com/api';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let stripe = Stripe('your_stripe_public_key'); // Replace with your Stripe public key

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartIcon = document.getElementById('cartIcon');
const cartModal = document.getElementById('cartModal');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalSpan = document.getElementById('cartTotal');
const cartCountSpan = document.querySelector('.cart-count');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const paymentModal = document.getElementById('paymentModal');
const searchInput = document.getElementById('searchInput');
const priceRange = document.getElementById('priceRange');
const priceValue = document.getElementById('priceValue');

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener('click', () => {
    if (document.body.hasAttribute('data-theme')) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// Preloader
window.addEventListener('load', () => {
    const preloader = document.querySelector('.preloader');
    preloader.classList.add('fade-out');
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 500);
});

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Ошибка загрузки товаров', 'error');
    }
}

// Display products with filters
function displayProducts(productsToShow) {
    if (!productsGrid) return;
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const maxPrice = parseInt(priceRange?.value) || 2000;
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    
    let filtered = productsToShow;
    
    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filter by category
    if (activeFilter !== 'all') {
        filtered = filtered.filter(p => p.category === activeFilter);
    }
    
    // Filter by price
    filtered = filtered.filter(p => p.price <= maxPrice);
    
    if (filtered.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = filtered.map(product => `
        <div class="product-card">
            ${product.price < 500 ? '<span class="product-badge">🔥 Хит</span>' : ''}
            <img src="${product.image_url || 'https://via.placeholder.com/400'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'Свежие и вкусные продукты'}</p>
                <div class="product-price">${product.price} AMD</div>
                <div class="product-unit">${product.unit}</div>
                <button class="add-to-cart" data-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i> В корзину
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            addToCart(productId);
        });
    });
}

// Add to cart with animation
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url,
            quantity: 1
        });
    }
    
    updateCart();
    showNotification(`${product.name} добавлен в корзину`, 'success');
    
    // Animation
    const btn = event.target.closest('.add-to-cart');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> В корзину';
        }, 1000);
    }
}

// Update cart
function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountSpan) cartCountSpan.textContent = totalItems;
    if (cartItemsContainer) displayCartItems();
}

// Display cart items
function displayCartItems() {
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Корзина пуста</p></div>';
        cartTotalSpan.textContent = '0';
        return;
    }
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} AMD</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" data-id="${item.id}" data-change="-1">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" data-id="${item.id}" data-change="1">+</button>
                <button class="remove-item" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalSpan.textContent = total;
    
    // Event listeners
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = parseInt(btn.dataset.id);
            const change = parseInt(btn.dataset.change);
            updateQuantity(productId, change);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = parseInt(btn.dataset.id);
            removeFromCart(productId);
        });
    });
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        updateCart();
        displayCartItems();
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCart();
    displayCartItems();
    showNotification('Товар удален из корзины', 'success');
}

// Checkout
async function checkout() {
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!customerName || !customerPhone || !customerAddress) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    const orderData = {
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_method: paymentMethod,
        payment_status: 'pending'
    };
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const order = await response.json();
        
        if (paymentMethod === 'card') {
            await processPayment(order.total);
        } else {
            showNotification('Заказ успешно оформлен! С вами свяжется оператор.', 'success');
            cart = [];
            updateCart();
            closeAllModals();
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification('Ошибка при оформлении заказа', 'error');
    }
}

// Process payment
async function processPayment(amount) {
    try {
        const response = await fetch(`${API_URL}/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        
        const { clientSecret } = await response.json();
        paymentModal.style.display = 'flex';
        
        const elements = stripe.elements();
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    fontFamily: '"Inter", sans-serif',
                    '::placeholder': { color: '#a0aec0' }
                }
            }
        });
        cardElement.mount('#card-element');
        
        document.getElementById('paymentSubmitBtn').onclick = async () => {
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardElement }
            });
            
            if (error) {
                showNotification(error.message, 'error');
            } else {
                showNotification('Оплата прошла успешно!', 'success');
                cart = [];
                updateCart();
                closeAllModals();
            }
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Ошибка при обработке платежа', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Close all modals
function closeAllModals() {
    cartModal.style.display = 'none';
    checkoutModal.style.display = 'none';
    paymentModal.style.display = 'none';
}

// Event listeners
if (cartIcon) {
    cartIcon.addEventListener('click', () => {
        displayCartItems();
        cartModal.style.display = 'flex';
    });
}

document.querySelectorAll('.close-cart, .close-checkout, .close-payment').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            showNotification('Корзина пуста', 'error');
            return;
        }
        cartModal.style.display = 'none';
        const orderSummary = document.getElementById('orderSummary');
        const orderTotal = document.getElementById('orderTotal');
        
        if (orderSummary && orderTotal) {
            orderSummary.innerHTML = cart.map(item => `
                <div class="order-item">
                    <span>${item.name} x ${item.quantity}</span>
                    <span>${item.price * item.quantity} AMD</span>
                </div>
            `).join('');
            orderTotal.textContent = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
        
        checkoutModal.style.display = 'flex';
    });
}

document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    checkout();
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayProducts(products);
    });
});

// Search
searchInput?.addEventListener('input', () => displayProducts(products));

// Price filter
priceRange?.addEventListener('input', (e) => {
    priceValue.textContent = e.target.value;
    displayProducts(products);
});

// Newsletter
document.getElementById('newsletterForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    if (email) {
        showNotification('Спасибо за подписку!', 'success');
        e.target.reset();
    }
});

// Promo button
document.getElementById('promoBtn')?.addEventListener('click', () => {
    document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
});

// Shop now button
document.getElementById('shopNowBtn')?.addEventListener('click', () => {
    document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
});

// Admin button
document.getElementById('adminBtn')?.addEventListener('click', () => {
    window.location.href = '/admin.html';
});

// Initialize Swiper
if (typeof Swiper !== 'undefined') {
    new Swiper('.testimonials-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        pagination: { el: '.swiper-pagination', clickable: true },
        breakpoints: {
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
        }
    });
}

// Load products
loadProducts();

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .no-products {
        text-align: center;
        padding: 60px;
        background: var(--white);
        border-radius: 20px;
    }
    
    .no-products i {
        font-size: 64px;
        color: var(--gray);
        margin-bottom: 20px;
    }
    
    .empty-cart {
        text-align: center;
        padding: 40px;
    }
    
    .empty-cart i {
        font-size: 64px;
        color: var(--gray);
        margin-bottom: 20px;
    }
    
    .order-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--light);
    }
`;
document.head.appendChild(style);