import express from "express";
import mysql from "mysql2/promise"; // Use promise-based MySQL library
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON request bodies
app.use(express.json());

const dbConnections = {}; // Object to store database connections for tenants

// Function to establish a MySQL connection
const connectToDB = async (config, tenantName) => {
  if (dbConnections[tenantName]) {
    // If the connection exists, return it
    return dbConnections[tenantName];
  }

  try {
    // Create a new connection pool
    const connection = await mysql.createPool(config);
    dbConnections[tenantName] = connection;
    console.log(`Connected to MySQL for tenant: ${tenantName}`);
    return connection;
  } catch (err) {
    console.error("Error connecting to MySQL:", err.message);
    throw err;
  }
};

// Verify SQL connection
app.post("/verify-sql-connection", async (req, res) => {
  const { host, user, password, database, tenantName } = req.body;

  if (!host || !user || !password || !database) {
    return res
      .status(400)
      .send({ status_code: 400, status: false, message: "Missing required database parameters" });
  }

  try {
    await connectToDB({ host, user, password, database }, tenantName);
    res.status(200).send({
      status_code: 200,
      status: true,
      message: "MySQL connection verified successfully",
    });
  } catch (err) {
    console.error("Connection verification failed:", err.message);
    res.status(500).send({
      status_code: 500,
      status: false,
      message: err.message,
    });
  }
});

// Execute dynamic SQL query
app.post("/sql-query", async (req, res) => {
  const { host, user, password, database, sqlQuery, tenantName } = req.body;

  if (!host || !user || !password || !database || !sqlQuery) {
    return res
      .status(400)
      .send({ status_code: 400, status: false, message: "Missing required parameters" });
  }

  try {
    const connection = await connectToDB({ host, user, password, database }, tenantName);
    const [results] = await connection.query(sqlQuery);
    res.status(200).send({
      status_code: 200,
      status: true,
      data: results,
    });
  } catch (err) {
    console.error("Error executing query:", err.message);
    res.status(500).send({
      status_code: 500,
      status: false,
      message: "Error executing query",
      error: err.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
