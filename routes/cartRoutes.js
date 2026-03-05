// routes/cartRoutes.js
const express = require('express');
const {
  addToCart,
  getCart,
  removeFromCart,
  getAllCarts,
  clearCart
} = require('../controllers/cartController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/add', authMiddleware, addToCart);
router.get('/:userId', authMiddleware, getCart);
router.delete('/remove/:cartItemId', authMiddleware, removeFromCart);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllCarts);
router.delete('/:userId/clear', authMiddleware, clearCart);

module.exports = router;
