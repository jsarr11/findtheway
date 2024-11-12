const express = require('express');
const router = express.Router();
const { connectToDb, closeDbConnection } = require('./dbConnect');
const path = require('path');

//////////////////////////    CHECK DB-CONNECTION   ////////////////////////////
// router.get('/', async (req, res) => {
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

// Home route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

module.exports = router;
