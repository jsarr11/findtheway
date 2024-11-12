const express = require('express');
const { connectToDb, closeDbConnection } = require('./dbConnect');
const path = require('path');

const app = express();
const port = 3000;

///////////////////////   DB-TESTING ROUTE   //////////////////////////////
// app.get('/', async (req, res) => {
//     let client;
//
//     try {
//         client = await connectToDb();
//         // You can use the client to interact with the database here
//
//         res.status(200).send('Hello, World!');
//
//     } catch (err) {
//         res.status(500).send('Error connecting to the database');
//
//     } finally {
//         if (client) {
//             await closeDbConnection(client);
//         }
//     }
// });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
