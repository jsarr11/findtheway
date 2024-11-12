const express = require('express');
const router = express.Router();
const { connectToDb, closeDbConnection } = require('./dbConnect');
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Home routes
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-el.html'));
});
router.get('/home-el', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-el.html'));
});
router.get('/home-en', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-en.html'));
});

// Serve signup pages
router.get('/signup-el', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup-el.html'));
});
router.get('/signup-en', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup-en.html'));
});

// Handle signup form submission
const handleSignup = async (req, res, lang) => {
    const { username, name, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    if (username.length > 10 || name.length > 10) {
        return res.status(400).send('Username and name must be 10 characters or fewer');
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
        return res.status(400).send('Password must be at least 8 characters long and contain at least 1 letter and 1 number');
    }

    try {
        const client = await connectToDb();
        const userCheckQuery = 'SELECT * FROM users WHERE username = $1';
        const userCheckResult = await client.query(userCheckQuery, [username]);

        if (userCheckResult.rows.length > 0) {
            await closeDbConnection(client);
            return res.status(400).send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const query = 'INSERT INTO users (username, name, password) VALUES ($1, $2, $3)';
        await client.query(query, [username, name, hashedPassword]);
        await closeDbConnection(client);

        req.session.username = username;
        res.sendFile(path.join(__dirname, `public/signup-success-${lang}.html`));
    } catch (err) {
        console.error('Error saving user to database', err);
        res.status(500).send('Error saving user to database');
    }
};

router.post('/signup-el', (req, res) => handleSignup(req, res, 'el'));
router.post('/signup-en', (req, res) => handleSignup(req, res, 'en'));

module.exports = router;
