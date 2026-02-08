require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
let b=mongoose.connect(process.env.MONGODB_URI);
b.then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', userSchema);

// Store logged-in users session data (in-memory, temporary solution)
const userSessions = {};

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

// Register Route
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, 'confirm-password': confirmPassword } = req.body;

    // Validate inputs
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.json({ success: true, message: 'User registered successfully. Please login.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Store user session
    const sessionId = 'session_' + Date.now() + '_' + Math.random();
    userSessions[sessionId] = {
      userId: user._id,
      username: user.username,
      email: user.email,
      timestamp: Date.now()
    };

    // Successful login - return user data
    res.json({ success: true, username: user.username, email: user.email, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Welcome Route
app.get('/welcome', (req, res) => {
  // In a production app, you'd use proper session management (cookies, JWT, etc.)
  // For now, we'll pass the username via query parameter
  const { username, email } = req.query;

  if (!username || !email) {
    return res.redirect('/');
  }

  const welcomePage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          padding: 20px;
        }

        .welcome-container {
          background: white;
          padding: 60px 40px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          text-align: center;
          max-width: 500px;
          width: 100%;
        }

        h1 {
          color: #667eea;
          font-size: 36px;
          margin-bottom: 15px;
        }

        .username {
          color: #764ba2;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 30px;
        }

        p {
          color: #666;
          font-size: 16px;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .info-box {
          background-color: #f0f0f0;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }

        .info-box strong {
          color: #667eea;
        }

        a {
          display: inline-block;
          margin-top: 30px;
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          transition: transform 0.2s;
        }

        a:hover {
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="welcome-container">
        <h1>Welcome!</h1>
        <div class="username">${decodeURIComponent(username)}</div>
        <p>You have successfully logged in to your account.</p>
        <div class="info-box">
          <strong>Email:</strong> ${decodeURIComponent(email)}
        </div>
        <a href="/">Logout</a>
      </div>
    </body>
    </html>
  `;

  res.send(welcomePage);
});

module.exports = app;