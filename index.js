import express from 'express';
import mysql from 'mysql2';

const app = express();
const PORT = 4000;

// Middleware to parse JSON request bodies
app.use(express.json());

let db = {}; // Variable to hold the active database connection

// Function to establish a MySQL connection if not already connected
const connectToDB = (config, tenantName) => {
    return new Promise((resolve, reject) => {
        if (db[tenantName] && db[tenantName].state !== 'disconnected') {
            // If already connected, resolve the existing connection
            return resolve(db);
        }

        // Create a new connection
        db[tenantName] = mysql.createConnection(config);

        db[tenantName].connect((err) => {
            if (err) {
                console.error('Error connecting to MySQL:', err);
                return reject(err);
            }
            console.log('Connected to MySQL');
            resolve(db);
        });
    });
};

// Endpoint to verify SQL connection with parameters from request body
app.post('/verify-sql-connection', async (req, res) => {
    const { host, user, password, database, tenantName } = req.body;

    // Validate required fields
    if (!host || !user || !password || !database) {
        return res.send({ status_code: 400, status: false, message: "Missing required database connection parameters" });
    }

    // Create a MySQL connection based on provided parameters
    try {
        await connectToDB({ host, user, password, database }, tenantName);
        db[tenantName].end(); // Close the connection after verification
        db[tenantName] = null; // Reset db variable after disconnecting
        res.status(200).send({ status_code: 200, status: true, message: 'MySQL connection verified successfully' });
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        res.send({ status_code: 500, status: false, message: err.message });
    }
});

// Endpoint to trigger a SQL query with a dynamic table name
app.post('/trigger-sql-query', async (req, res) => {
    const { host, user, password, database, tableName, condition, tenantName } = req.body;

    // Validate required fields
    if (!host || !user || !password || !database || !tableName) {
        return res.send({ status_code: 400, status: false, message: "Missing required parameters" });
    }

    // Validate table name to prevent SQL injection
    if (typeof tableName !== 'string' || !/^[a-zA-Z_]+$/.test(tableName)) {
        return res.send({ status_code: 400, status: false, message: "Invalid table name" });
    }

    try {
        // Ensure the database connection is established
        await connectToDB({ host, user, password, database, }, tenantName);

        // Construct the query string
        const query = `SELECT * FROM ?? ${condition ? 'WHERE ' + condition : ''}`;

        // Execute the query
        db[tenantName].query(query, [tableName], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.send({ status_code: 500, status: false, message: 'Error executing query', error: err.message });
            }
            res.status(200).send({ status_code: 200, status: true, data: results });
        });
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        res.send({ status_code: 500, status: false, message: 'Error connecting to MySQL', error: err.message });
    }
});

// Endpoint to trigger a SQL query with a dynamic table name
app.post('/sql-query', async (req, res) => {
    const { host, user, password, database, sqlQuery, condition, tenantName } = req.body;

    // Validate required fields
    if (!host || !user || !password || !database || !sqlQuery) {
        return res.send({ status_code: 400, status: false, message: "Missing required parameters" });
    }
    try {
        // Ensure the database connection is established
        await connectToDB({ host, user, password, database, }, tenantName);
        const query = sqlQuery;

        // Execute the query
        db[tenantName].query(query, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.send({ status_code: 500, status: false, message: 'Error executing query', error: err.message });
            }
            res.status(200).send({ status_code: 200, status: true, data: results });
        });
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        res.send({ status_code: 500, status: false, message: 'Error connecting to MySQL', error: err.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
