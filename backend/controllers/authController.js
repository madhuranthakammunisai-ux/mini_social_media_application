const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = (req, res) => {
  const { username, email, password, bio, profile_picture } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  // Check if username or email already exists
  db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (row) return res.status(400).json({ message: 'Username or email already in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userBio = bio || 'Passionate social media user 🚀';
    const userAvatar = profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    db.run(
      'INSERT INTO users (username, email, password, bio, profile_picture) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, userBio, userAvatar],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error registering user.', error: err.message });

        const token = jwt.sign({ id: this.lastID, username, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
          message: 'User registered successfully!',
          token,
          user: { id: this.lastID, username, email, bio: userBio, profile_picture: userAvatar }
        });
      }
    );
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profile_picture: user.profile_picture
      }
    });
  });
};

exports.getMe = (req, res) => {
  db.get('SELECT id, username, email, bio, profile_picture, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  });
};
