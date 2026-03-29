const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "ecommerce-db.cxygkimc2v7v.ap-south-1.rds.amazonaws.com",
  user: "admin",
  password: "ecommercePASS1",
  database: "ecommerce"
});

connection.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("Connected to RDS MySQL");
  }
});

module.exports = connection;