const db = require("./db");
const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Ecommerce API Running");
});

app.get("/testdb", (req, res) => {
  db.query("SELECT 1", (err, result) => {
    if (err) return res.send(err);
    res.send("Database Connected Successfully");
  });
});

app.post("/add-product", (req, res) => {
  const { name, price, description, image } = req.body;

  const sql = "INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, price, description, image], (err, result) => {
    if (err) return res.send(err);
    res.send("Product added successfully");
  });
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.send(err);
    res.json(result);
  });
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

  db.query(sql, [name, email, password], (err, result) => {
    if (err) return res.send(err);
    res.send("User registered successfully");
  });
});

app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.send(err);
    res.json(result);
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, result) => {
    if (err) return res.send(err);

    if (result.length > 0) {
      res.send("Login successful");
    } else {
      res.send("Invalid credentials");
    }
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});