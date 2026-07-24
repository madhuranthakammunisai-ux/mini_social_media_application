const db = require('../config/database');

exports.createPost = (req, res) => {
  const userId = req.user.id;
  const { caption, image } = req.body;

  if (!caption && !image) {
    return res.status(400).json({ message: 'Post must contain a caption or image.' });
  }

  db.run(
    'INSERT INTO posts (user_id, caption, image) VALUES (?, ?, ?)',
    [userId, caption || '', image || ''],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to create post.', error: err.message });
      
      const postId = this.lastID;
      db.get(
        `SELECT p.*, u.username, u.profile_picture 
         FROM posts p JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [postId],
        (err, post) => {
          res.status(201).json({
            message: 'Post created successfully!',
            post: {
              ...post,
              likesCount: 0,
              commentsCount: 0,
              isLiked: false
            }
          });
        }
      );
    }
  );
};

exports.getFeed = (req, res) => {
  const currentUserId = req.user ? req.user.id : 0;

  const query = `
    SELECT 
      p.id, p.caption, p.image, p.created_at, p.user_id,
      u.username, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;

  db.all(query, [currentUserId], (err, posts) => {
    if (err) return res.status(500).json({ message: 'Error retrieving feed.', error: err.message });
    
    const formattedPosts = posts.map(p => ({
      ...p,
      isLiked: Boolean(p.isLiked)
    }));

    res.json({ posts: formattedPosts });
  });
};

exports.getSinglePost = (req, res) => {
  const postId = req.params.id;
  const currentUserId = req.user ? req.user.id : 0;

  const query = `
    SELECT 
      p.id, p.caption, p.image, p.created_at, p.user_id,
      u.username, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likesCount,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentsCount,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `;

  db.get(query, [currentUserId, postId], (err, post) => {
    if (err || !post) return res.status(404).json({ message: 'Post not found.' });

    res.json({
      post: {
        ...post,
        isLiked: Boolean(post.isLiked)
      }
    });
  });
};

exports.updatePost = (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const { caption, image } = req.body;

  db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err || !post) return res.status(404).json({ message: 'Post not found.' });
    if (post.user_id !== userId) return res.status(403).json({ message: 'Unauthorized to edit this post.' });

    db.run(
      'UPDATE posts SET caption = COALESCE(?, caption), image = COALESCE(?, image) WHERE id = ?',
      [caption, image, postId],
      function (err) {
        if (err) return res.status(500).json({ message: 'Failed to update post.' });
        res.json({ message: 'Post updated successfully!' });
      }
    );
  });
};

exports.deletePost = (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err || !post) return res.status(404).json({ message: 'Post not found.' });
    if (post.user_id !== userId) return res.status(403).json({ message: 'Unauthorized to delete this post.' });

    db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to delete post.' });
      res.json({ message: 'Post deleted successfully!' });
    });
  });
};

// Like / Unlike toggle
exports.toggleLike = (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId], (err, existingLike) => {
    if (err) return res.status(500).json({ message: 'Database error.' });

    if (existingLike) {
      db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to unlike post.' });
        
        db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId], (err, row) => {
          res.json({ liked: false, likesCount: row.count });
        });
      });
    } else {
      db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to like post.' });

        db.get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId], (err, row) => {
          res.json({ liked: true, likesCount: row.count });
        });
      });
    }
  });
};

// Comments
exports.getComments = (req, res) => {
  const postId = req.params.id;
  const query = `
    SELECT c.id, c.comment, c.created_at, c.user_id, u.username, u.profile_picture
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;

  db.all(query, [postId], (err, comments) => {
    if (err) return res.status(500).json({ message: 'Failed to load comments.' });
    res.json({ comments });
  });
};

exports.addComment = (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ message: 'Comment text cannot be empty.' });
  }

  db.run(
    'INSERT INTO comments (user_id, post_id, comment) VALUES (?, ?, ?)',
    [userId, postId, comment.trim()],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to post comment.' });

      const commentId = this.lastID;
      db.get(
        'SELECT c.id, c.comment, c.created_at, c.user_id, u.username, u.profile_picture FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
        [commentId],
        (err, newComment) => {
          res.status(201).json({ message: 'Comment added!', comment: newComment });
        }
      );
    }
  );
};

exports.deleteComment = (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user.id;

  db.get('SELECT user_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err || !comment) return res.status(404).json({ message: 'Comment not found.' });
    if (comment.user_id !== userId) return res.status(403).json({ message: 'Unauthorized to delete comment.' });

    db.run('DELETE FROM comments WHERE id = ?', [commentId], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to delete comment.' });
      res.json({ message: 'Comment deleted successfully.' });
    });
  });
};
