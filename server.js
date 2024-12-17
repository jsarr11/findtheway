const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const routes = require('./routes');
const app = express();
const port = 3000;

// Set up session management
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.json());

// Set up body parsing
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));


// Use the routes defined in routes.js
app.use('/', routes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
