const express = require('express');
const path = require('path');
const routes = require('./routes');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the routes defined in routes.js
app.use('/', routes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
