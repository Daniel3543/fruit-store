-- Create database
CREATE DATABASE fruit_store;

-- Create tables
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123)
INSERT INTO admins (username, password) 
VALUES ('admin', 'DV123');

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    unit VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    order_status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample products
INSERT INTO products (name, category, price, description, image_url, unit) VALUES
('Яблоки Гала', 'Фрукты', 800, 'Свежие красные яблоки сорта Гала', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400', 'кг'),
('Бананы', 'Фрукты', 600, 'Спелые желтые бананы', 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400', 'кг'),
('Апельсины', 'Фрукты', 700, 'Сочные апельсины', 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400', 'кг'),
('Помидоры', 'Овощи', 500, 'Спелые красные помидоры', 'https://images.unsplash.com/photo-1546094096-0df4bcaaa2e8?w=400', 'кг'),
('Огурцы', 'Овощи', 400, 'Свежие хрустящие огурцы', 'https://images.unsplash.com/photo-1580327344456-0cdda5cf9cbe?w=400', 'кг'),
('Картофель', 'Овощи', 300, 'Молодой картофель', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', 'кг'),
('Клубника', 'Ягоды', 1200, 'Свежая клубника', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400', 'кг'),
('Виноград', 'Фрукты', 900, 'Сладкий виноград', 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400', 'кг');