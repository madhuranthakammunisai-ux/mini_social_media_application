const db = require('../config/database');

exports.getProfile = (req, res) => {
  const userId = req.params.id;

  db.get('SELECT id, username, email, bio, profile_picture, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found.' });

    // Fetch stats: follower count, following count, post count
    db.get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followersCount,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as followingCount,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as postsCount,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ?) as isFollowing`,
      [userId, userId, userId, req.user ? req.user.id : 0, userId],
      (err, stats) => {
        if (err) return res.status(500).json({ message: 'Error retrieving profile stats.' });

        res.json({
          user: {
            ...user,
            followersCount: stats.followersCount || 0,
            followingCount: stats.followingCount || 0,
            postsCount: stats.postsCount || 0,
            isFollowing: Boolean(stats.isFollowing)
          }
        });
      }
    );
  });
};

exports.updateProfile = (req, res) => {
  const userId = req.user.id;
  const { bio, profile_picture, username } = req.body;

  db.run(
    'UPDATE users SET bio = COALESCE(?, bio), profile_picture = COALESCE(?, profile_picture), username = COALESCE(?, username) WHERE id = ?',
    [bio, profile_picture, username, userId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to update profile', error: err.message });
      
      db.get('SELECT id, username, email, bio, profile_picture FROM users WHERE id = ?', [userId], (err, user) => {
        res.json({ message: 'Profile updated successfully!', user });
      });
    }
  );
};

exports.followUser = (req, res) => {
  const followerId = req.user.id;
  const followingId = parseInt(req.params.id);

  if (followerId === followingId) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  db.run(
    'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    [followerId, followingId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json({ message: 'User followed successfully.' });
    }
  );
};

exports.unfollowUser = (req, res) => {
  const followerId = req.user.id;
  const followingId = parseInt(req.params.id);

  db.run(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId],
    function (err) {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json({ message: 'User unfollowed successfully.' });
    }
  );
};

exports.getFollowers = (req, res) => {
  const userId = req.params.id;
  db.all(
    `SELECT u.id, u.username, u.profile_picture, u.bio 
     FROM follows f JOIN users u ON f.follower_id = u.id 
     WHERE f.following_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Error retrieving followers.' });
      res.json({ followers: rows });
    }
  );
};

exports.getFollowing = (req, res) => {
  const userId = req.params.id;
  db.all(
    `SELECT u.id, u.username, u.profile_picture, u.bio 
     FROM follows f JOIN users u ON f.following_id = u.id 
     WHERE f.follower_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Error retrieving following list.' });
      res.json({ following: rows });
    }
  );
};
