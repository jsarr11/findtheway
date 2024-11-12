const { Pool } = require('pg');

// Create a new pool instance
const pool = new Pool({
    user: 'db-admin',
    host: 'localhost',
    database: 'findtheway',
    password: 'db-admin',
    port: 5433, // Updated port
});

// Function to connect to the database
const connectToDb = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the database');
        return client;
    } catch (err) {
        console.error('Error connecting to the database', err);
        throw err;
    }
};

// Function to close the database connection
const closeDbConnection = async (client) => {
    try {
        await client.release();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing the database connection', err);
        throw err;
    }
};

// Export the connect and close functions
module.exports = {
    connectToDb,
    closeDbConnection,
};
