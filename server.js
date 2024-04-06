const express = require('express');
const path = require('path');
const mysql = require('mysql');
const fs = require('fs');
const session = require('express-session');

const app = express();
const port = 3000;
const connection = mysql.createConnection({
    pool: '10',
    host: 'localhost', // Replace 'localhost' with your MySQL host
    user: 'shruti', // Replace 'your_mysql_username' with your MySQL username
    password: 'root', // Replace 'your_mysql_password' with your MySQL password
    database: 'login' // Specify the name of the database you created
});

// Check if the connection to the database is successful
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL server:', err);
        return;
    }
    console.log('Connected to MySQL server');
});

// Middleware for logging requests
app.use((req, res, next) => {
    const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;

    // Log all requests
    logStream.write(logMessage);
    console.log(logMessage); // Log to console as well

    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Configure express-session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Function to execute MySQL queries
function executeQuery(sql, values) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// Redirect root route to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Serve login page
app.get('/login', (req, res) => {
    console.log(`[${new Date().toISOString()}] Serving login page`);
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    console.log(`[${new Date().toISOString()}] Serving signup page`);
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }

    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Testing database connection`);
    try {
        const testResult = await executeQuery('SELECT 1');
        console.log(`[${new Date().toISOString()}] Database connection successful`);
        res.status(200).send('Database connection successful');
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error connecting to database: ${error}`);
        res.status(500).send('Failed to connect to database');
    }
});

// Sign Up endpoint
app.post('/signup', async (req, res) => {
    const { username, email_id, password } = req.body; // Change 'email' to 'email_id'

    try {
        // Insert user into the database
        await executeQuery('INSERT INTO login_details (username, email_id, password) VALUES (?, ?, ?)', [username, email_id, password]); // Change 'email' to 'email_id'
        console.log(`[${new Date().toISOString()}] User ${username} signed up successfully`);
        res.redirect('/login'); // Redirect to the login page after successful signup
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during sign up: ${error}`);
        res.status(500).send('Failed to sign up');
    }
});

// Handle login POST request
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists in the database
        const users = await executeQuery('SELECT * FROM login_details WHERE username = ? AND password = ?', [username, password]);

        if (users.length > 0) {
            // User authenticated successfully
            req.session.username = username;
            res.redirect('/dashboard'); // Redirect to dashboard upon successful login
        } else {
            res.status(401).send('Invalid username or password');
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during login: ${error}`);
        res.status(500).send('Failed to login');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
