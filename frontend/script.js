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

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display products
function displayProducts(productsToShow) {
    if (!productsGrid) return;
    
    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card">
            <img src="${product.image_url || 'https://via.placeholder.com/400'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price">${product.price} AMD</div>
                <div class="product-unit">${product.unit}</div>
                <button class="add-to-cart" data-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i> В корзину
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to add-to-cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            addToCart(productId);
        });
    });
}

// Add to cart
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
    showNotification('Товар добавлен в корзину');
}

// Update cart display
function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountSpan) cartCountSpan.textContent = totalItems;
    
    // Update cart modal if open
    if (cartItemsContainer) {
        displayCartItems();
    }
}

// Display cart items
function displayCartItems() {
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Корзина пуста</p>';
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
    
    // Add event listeners for quantity buttons
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(btn.dataset.id);
            const change = parseInt(btn.dataset.change);
            updateQuantity(productId, change);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
        payment_status: paymentMethod === 'card' ? 'pending' : 'pending'
    };
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const order = await response.json();
        
        if (paymentMethod === 'card') {
            // Process card payment
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

// Process payment with Stripe
async function processPayment(amount) {
    try {
        const response = await fetch(`${API_URL}/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        
        const { clientSecret } = await response.json();
        
        // Open payment modal
        paymentModal.style.display = 'flex';
        
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');
        
        document.getElementById('paymentSubmitBtn').onclick = async () => {
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                }
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
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
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
                <div>${item.name} x ${item.quantity} = ${item.price * item.quantity} AMD</div>
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

// Category filters
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.dataset.category;
        if (category === 'all') {
            displayProducts(products);
        } else {
            const filtered = products.filter(p => p.category === category);
            displayProducts(filtered);
        }
    });
});

// Shop now button
document.getElementById('shopNowBtn')?.addEventListener('click', () => {
    document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
});

// Admin button
document.getElementById('adminBtn')?.addEventListener('click', () => {
    window.location.href = '/admin.html';
});

// Load products on page load
loadProducts();

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);