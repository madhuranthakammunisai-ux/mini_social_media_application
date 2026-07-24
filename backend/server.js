const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static files if needed
app.use(express.static(path.join(__dirname, '../')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Root route & status check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mini Social Media API is operational!' });
});

// Fallback to frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Social Media Backend Server running on port ${PORT}`);
  console.log(`🌐 Live API URL: http://localhost:${PORT}/api`);
  console.log(`=================================================`);
});
