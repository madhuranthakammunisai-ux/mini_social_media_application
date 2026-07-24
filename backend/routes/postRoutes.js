const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');

router.get('/feed', postController.getFeed);
router.get('/:id', postController.getSinglePost);
router.post('/', authenticateToken, postController.createPost);
router.put('/:id', authenticateToken, postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);

// Like route
router.post('/:id/like', authenticateToken, postController.toggleLike);

// Comment routes
router.get('/:id/comments', postController.getComments);
router.post('/:id/comments', authenticateToken, postController.addComment);
router.delete('/comments/:commentId', authenticateToken, postController.deleteComment);

module.exports = router;
