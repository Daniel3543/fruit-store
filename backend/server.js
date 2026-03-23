import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  ssl: {
    rejectUnauthorized: false
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============ AUTH ROUTES ============
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PRODUCTS ROUTES ============
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE active = true ORDER BY category, name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products/all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, unit } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const result = await pool.query(
      'INSERT INTO products (name, category, price, description, image_url, unit, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, category, price, description, imageUrl, unit, true]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, unit, active } = req.body;
    let imageUrl = req.body.image_url;
    
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const result = await pool.query(
      'UPDATE products SET name = $1, category = $2, price = $3, description = $4, image_url = $5, unit = $6, active = $7 WHERE id = $8 RETURNING *',
      [name, category, price, description, imageUrl, unit, active === 'true' || active === true, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ORDERS ROUTES ============
app.post('/api/orders', async (req, res) => {
  try {
    const { items, total, customer_name, customer_phone, customer_address, payment_method, payment_status } = req.body;
    
    const result = await pool.query(
      'INSERT INTO orders (items, total, customer_name, customer_phone, customer_address, payment_method, payment_status, order_date) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
      [JSON.stringify(items), total, customer_name, customer_phone, customer_address, payment_method, payment_status]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY order_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await pool.query(
      'UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ STATISTICS ROUTES ============
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = '';
    
    if (period === 'day') {
      dateFilter = "WHERE order_date >= NOW() - INTERVAL '1 day'";
    } else if (period === 'week') {
      dateFilter = "WHERE order_date >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "WHERE order_date >= NOW() - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateFilter = "WHERE order_date >= NOW() - INTERVAL '365 days'";
    }
    
    const ordersQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        AVG(total) as average_order_value
      FROM orders 
      ${dateFilter}
    `);
    
    const topProductsQuery = await pool.query(`
      SELECT 
        items->>'name' as product_name,
        COUNT(*) as times_ordered,
        SUM((items->>'quantity')::int) as total_quantity
      FROM orders, jsonb_array_elements(items) as items
      ${dateFilter ? `WHERE order_date >= NOW() - INTERVAL '${period === 'day' ? '1 day' : period === 'week' ? '7 days' : period === 'month' ? '30 days' : '365 days'}'` : ''}
      GROUP BY product_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `);
    
    const dailyStatsQuery = await pool.query(`
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as orders_count,
        SUM(total) as revenue
      FROM orders
      ${dateFilter ? `WHERE order_date >= NOW() - INTERVAL '${period === 'day' ? '1 day' : period === 'week' ? '7 days' : period === 'month' ? '30 days' : '365 days'}'` : ''}
      GROUP BY DATE(order_date)
      ORDER BY date DESC
      LIMIT 30
    `);
    
    res.json({
      summary: ordersQuery.rows[0],
      top_products: topProductsQuery.rows,
      daily_stats: dailyStatsQuery.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PAYMENT ROUTES ============
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'amd' } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses smallest currency unit
      currency: 'usd', // Convert AMD to USD or use supported currency
      metadata: {
        amount_amd: amount
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});