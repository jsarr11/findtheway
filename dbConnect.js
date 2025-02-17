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

/////////////////   DB-SCRIPTS   /////////////////
// CREATE TABLE users (
//     id SERIAL PRIMARY KEY,
//     username VARCHAR(10) NOT NULL UNIQUE,
//     name VARCHAR(10) NOT NULL,
//     password TEXT NOT NULL
// );
//
// CREATE TABLE scores (
//     id SERIAL PRIMARY KEY REFERENCES users(id),
//     kruskal INT DEFAULT 0,
//     prim INT DEFAULT 0
// );

// **********  ONLINE DB **************
// INSERT INTO users (username, name, password)
// VALUES
// ('user01', 'Name01', 'pass01'),
//     ('user02', 'Name02', 'pass02'),
//     ('user03', 'Name03', 'pass03'),
//     ('user04', 'Name04', 'pass04'),
//     ('user05', 'Name05', 'pass05'),
//     ('user06', 'Name06', 'pass06'),
//     ('user07', 'Name07', 'pass07'),
//     ('user08', 'Name08', 'pass08'),
//     ('user09', 'Name09', 'pass09'),
//     ('user10', 'Name10', 'pass10'),
//     ('user11', 'Name11', 'pass11'),
//     ('user12', 'Name12', 'pass12'),
//     ('user13', 'Name13', 'pass13'),
//     ('user14', 'Name14', 'pass14'),
//     ('user15', 'Name15', 'pass15'),
//     ('user16', 'Name16', 'pass16'),
//     ('user17', 'Name17', 'pass17'),
//     ('user18', 'Name18', 'pass18'),
//     ('user19', 'Name19', 'pass19'),
//     ('user20', 'Name20', 'pass20');
//
// INSERT INTO scores (id, kruskal, prim) VALUES
// (2, 45, 78),
//     (3, 92, 34),
//     (4, 67, 89),
//     (5, 23, 56),
//     (6, 88, 90),
//     (7, 12, 44),
//     (8, 95, 18),
//     (9, 50, 67),
//     (10, 76, 21),
//     (11, 33, 80),
//     (12, 99, 99),
//     (13, 41, 55),
//     (14, 60, 72),
//     (15, 15, 63),
//     (16, 82, 14),
//     (17, 29, 91),
//     (18, 70, 48),
//     (19, 58, 31),
//     (20, 37, 79),
//     (21, 25, 88);

