require("dotenv").config();
const db = require("./db");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// ========== IMAGE UPLOAD SETUP ==========
const uploadDir = path.join(__dirname, "frontend", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  }
});

// ========== MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
  next();
};

// ========== IMAGE UPLOAD ROUTE ==========
app.post("/upload", authenticateToken, verifyAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// ========== PUBLIC ROUTES ==========
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get("/products/:id", (req, res) => {
  db.query("SELECT * FROM products WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json(result[0]);
  });
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length > 0) return res.status(400).json({ error: "Email already registered" });
      const hashed = await bcrypt.hash(password, 10);
      db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
        [name, email, hashed],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ message: "User registered successfully", userId: result.insertId });
        }
      );
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const match = await bcrypt.compare(password, result[0].password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: result[0].id, email: result[0].email, role: result[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token, user: { id: result[0].id, name: result[0].name, email: result[0].email, role: result[0].role } });
  });
});

// ========== USER ROUTES ==========
app.get("/profile", authenticateToken, (req, res) => {
  db.query("SELECT id, name, email, role, created_at FROM users WHERE id = ?", [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0]);
  });
});

app.post("/cart/add", authenticateToken, (req, res) => {
  const { product_id, quantity } = req.body;
  db.query(
    "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
    [req.user.id, product_id, quantity, quantity],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Product added to cart" });
    }
  );
});

app.get("/cart", authenticateToken, (req, res) => {
  db.query(
    `SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image 
     FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
});

app.delete("/cart/remove/:cart_id", authenticateToken, (req, res) => {
  db.query("DELETE FROM cart WHERE id = ? AND user_id = ?", [req.params.cart_id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Item removed from cart" });
  });
});

app.post("/orders", authenticateToken, (req, res) => {
  const user_id = req.user.id;
  db.query(
    "SELECT c.product_id, c.quantity, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?",
    [user_id],
    (err, cartItems) => {
      if (err) return res.status(500).json({ error: err.message });
      if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      db.query("INSERT INTO orders (user_id, total, status) VALUES (?, ?, 'pending')", [user_id, total], (err, orderResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const orderId = orderResult.insertId;
        const orderItems = cartItems.map(item => [orderId, item.product_id, item.quantity, item.price]);
        db.query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?", [orderItems], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          db.query("DELETE FROM cart WHERE user_id = ?", [user_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Order placed successfully", orderId });
          });
        });
      });
    }
  );
});

app.get("/orders", authenticateToken, (req, res) => {
  db.query(
    `SELECT o.*, 
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) 
       FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items
     FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
});

// ========== ADMIN ROUTES ==========
app.post("/admin/products", authenticateToken, verifyAdmin, (req, res) => {
  const { name, price, description, image, stock } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Name and price are required" });
  db.query(
    "INSERT INTO products (name, price, description, image, stock) VALUES (?, ?, ?, ?, ?)",
    [name, price, description, image, stock || 0],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Product added successfully", productId: result.insertId });
    }
  );
});

app.put("/admin/products/:id", authenticateToken, verifyAdmin, (req, res) => {
  const { name, price, description, image, stock } = req.body;
  db.query(
    "UPDATE products SET name = ?, price = ?, description = ?, image = COALESCE(?, image), stock = ? WHERE id = ?",
    [name, price, description, image || null, stock, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Product not found" });
      res.json({ message: "Product updated successfully" });
    }
  );
});

app.delete("/admin/products/:id", authenticateToken, verifyAdmin, (req, res) => {
  db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  });
});

app.get("/admin/users", authenticateToken, verifyAdmin, (req, res) => {
  db.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get("/admin/orders", authenticateToken, verifyAdmin, (req, res) => {
  db.query(
    `SELECT o.*, u.name as user_name, u.email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`,
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
});

app.put("/admin/orders/:id/status", authenticateToken, verifyAdmin, (req, res) => {
  const { status } = req.body;
  db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Order status updated" });
  });
});

app.get("/admin/stats", authenticateToken, verifyAdmin, (req, res) => {
  const queries = {
    totalUsers: "SELECT COUNT(*) as count FROM users",
    totalProducts: "SELECT COUNT(*) as count FROM products",
    totalOrders: "SELECT COUNT(*) as count FROM orders",
    totalRevenue: "SELECT SUM(total) as total FROM orders WHERE status != 'cancelled'",
    pendingOrders: "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
  };
  let results = {}, completed = 0;
  for (let [key, query] of Object.entries(queries)) {
    db.query(query, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      results[key] = result[0].count || result[0].total || 0;
      completed++;
      if (completed === Object.keys(queries).length) res.json(results);
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
