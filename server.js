require("dotenv").config();
const db = require("./db");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Ecommerce API Running");
});

// Test DB
app.get("/testdb", (req, res) => {
  db.query("SELECT 1", (err, result) => {
    if (err) return res.status(500).send(err);
    res.send("Database Connected Successfully");
  });
});

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name, email, hashed], (err) => {
    if (err) return res.status(500).send(err);
    res.send("User registered successfully");
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.length === 0) return res.status(401).send("Invalid credentials");

    const match = await bcrypt.compare(password, result[0].password);
    if (!match) return res.status(401).send("Invalid credentials");

    const token = jwt.sign({ id: result[0].id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  });
});

// Add product
app.post("/add-product", (req, res) => {
  const { name, price, description, image } = req.body;
  const sql = "INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, price, description, image], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Product added successfully");
  });
});

// Get products
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Get users (for testing only — remove later)
app.get("/users", (req, res) => {
  db.query("SELECT id, name, email FROM users", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});