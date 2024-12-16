const express = require('express');
const router = express.Router();
const { connectToDb, closeDbConnection } = require('./dbConnect');
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

//////////////////////////   HOME   ///////////////////////////////
// Only one route is needed since both languages are in one page.
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

///////////////////////////   SIGN UP   //////////////////////////////
// Serve the merged signup page
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle signup form submission
const handleSignup = async (req, res) => {
    const { username, name, password, confirmPassword, lang = 'el' } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send(lang === 'en' ? 'Passwords do not match' : 'Οι κωδικοί δεν ταιριάζουν');
    }

    if (username.length > 10 || name.length > 10) {
        return res.status(400).send(lang === 'en'
            ? 'Username and name must be 10 characters or fewer'
            : 'Το όνομα χρήστη και το όνομα πρέπει να είναι το πολύ 10 χαρακτήρες');
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
        return res.status(400).send(lang === 'en'
            ? 'Password must be at least 8 characters long and contain at least 1 letter and 1 number'
            : 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες και να περιλαμβάνει 1 γράμμα και 1 αριθμό');
    }

    try {
        const client = await connectToDb();
        const userCheckQuery = 'SELECT * FROM users WHERE username = $1';
        const userCheckResult = await client.query(userCheckQuery, [username]);

        if (userCheckResult.rows.length > 0) {
            await closeDbConnection(client);
            return res.status(400).send(lang === 'en'
                ? 'Username already exists'
                : 'Το όνομα χρήστη υπάρχει ήδη');
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const query = 'INSERT INTO users (username, name, password) VALUES ($1, $2, $3)';
        await client.query(query, [username, name, hashedPassword]);
        await closeDbConnection(client);

        req.session.username = username;
        // no route created for signup-success page
        res.sendFile(path.join(__dirname, `public/signup-success.html`));
    } catch (err) {
        console.error('Error saving user to database', err);
        res.status(500).send(lang === 'en'
            ? 'Error saving user to database'
            : 'Σφάλμα κατά την αποθήκευση του χρήστη στη βάση δεδομένων');
    }
};

router.post('/signup', (req, res) => handleSignup(req, res));

///////////////////////////   LOGIN   ///////////////////////////////////
// Serve the merged login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login form submission
const handleLogin = async (req, res) => {
    const { username, password, lang = 'el' } = req.body;

    try {
        const client = await connectToDb();
        const userQuery = 'SELECT * FROM users WHERE username = $1';
        const userResult = await client.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            await closeDbConnection(client);
            return res.status(400).send(lang === 'en'
                ? 'Username or password is incorrect'
                : 'Το όνομα χρήστη ή ο κωδικός είναι λάθος');
        }

        const user = userResult.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            await closeDbConnection(client);
            return res.status(400).send(lang === 'en'
                ? 'Username or password is incorrect'
                : 'Το όνομα χρήστη ή ο κωδικός είναι λάθος');
        }

        req.session.username = username;
        await closeDbConnection(client);
        res.redirect(`/user-page`); // Redirect to language-specific user page
    } catch (err) {
        console.error('Error logging in', err);
        res.status(500).send(lang === 'en'
            ? 'Error logging in'
            : 'Σφάλμα κατά τη διαδικασία σύνδεσης');
    }
};

router.post('/login', (req, res) => handleLogin(req, res));

///////////////////////////   USER PAGE   ///////////////////////////
// Serve unified user page
router.get('/user-page', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login'); // redirect to your unified login page
    }
    res.sendFile(path.join(__dirname, 'public', 'user-page.html'));
});

router.get('/get-username', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ username: req.session.username });
});

///////////////////////////   LOGOUT   ///////////////////////////
// Handle logout for Greek page
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to log out');
        }
        res.redirect('/');
    });
});

///////////////////////////   INFO PAGES   //////////////////////////////
// Serve info pages
router.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'info.html'));
});

///////////////////////////   PLAY KRUSKAL PAGE   //////////////////////////////
router.get('/play-kruskal', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login'); // Unified login route
    }
    res.sendFile(path.join(__dirname, 'public', 'play-kruskal.html'));
});

///////////////////////////   PLAY PRIM PAGE   //////////////////////////////
// Serve unified play prim page
router.get('/play-prim', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login'); // single login route
    }
    res.sendFile(path.join(__dirname, 'public', 'play-prim.html'));
});

///////////////////////////   THEORY PAGES   //////////////////////////////
// Serve theory Kruskal pages
router.get('/theory-kruskal', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'theory-kruskal.html'));
});

router.get('/theory-prim', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'theory-prim.html'));
});

///////////////////////////   TUTORIAL KRUSKAL PAGES   //////////////////////////////
// Serve unified tutorial prim page
router.get('/tutorial-kruskal', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        // Redirect to a unified login page or choose language-based login as needed
        // For simplicity, assume a unified login route:
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'tutorial-kruskal.html'));
});

// Serve unified tutorial prim page
router.get('/tutorial-prim', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        // Redirect to a unified login page or choose language-based login as needed
        // For simplicity, assume a unified login route:
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'tutorial-prim.html'));
});

//////////////////////////////   SCORES PAGES   //////////////////////////////
// Serve scores pages
router.get('/scores', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'scores.html'));
});

// ///////////////////////////   BACK BUTTON ROUTES   //////////////////////////////
// // Serve back button routes for user pages
// router.get('/user-page-back', (req, res) => {
//     res.redirect('/user-page');
// });
//
// // Serve back button routes for play pages
// router.get('/play-kruskal-back', (req, res) => {
//     res.redirect('/play-kruskal.html');
// });
// router.get('/play-prim-back', (req, res) => {
//     res.redirect('/play-prim.html');
// });

//////////////////////////////   SERVE GAMES   /////////////////////////////////////
// Serve game page with session check
router.get('/main-game-prim', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'main-game-prim.html'));
});

// Serve  Kruskal's game page with session check
router.get('/main-game-kruskal', (req, res) => {
    // Check if user is authenticated
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'main-game-kruskal.html'));
});

module.exports = router;