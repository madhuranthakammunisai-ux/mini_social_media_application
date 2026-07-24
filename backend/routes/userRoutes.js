const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:id', userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.post('/:id/follow', authenticateToken, userController.followUser);
router.delete('/:id/follow', authenticateToken, userController.unfollowUser);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

module.exports = router;
