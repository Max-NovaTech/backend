// routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Admin: Add product
router.post('/add', authMiddleware, adminMiddleware, productController.addProduct);

// Get all products
router.get('/', productController.getAllProducts);

// Get products visible in shop (public endpoint)
router.get('/shop', productController.getShopProducts);

// Get products visible for agents
router.get('/agent-products', productController.getAgentProducts);

// Get a single product
router.get('/:id', productController.getProductById);

// Admin: Update product
router.put('/update/:id', authMiddleware, adminMiddleware, productController.updateProduct);

// Toggle product shop visibility
router.put('/toggle-shop/:id', authMiddleware, adminMiddleware, productController.toggleShopVisibility);

// Set product stock to zero
router.put('/zero-stock/:id', authMiddleware, adminMiddleware, productController.setProductStockToZero);

router.patch('/reset-all-stock-to-zero', authMiddleware, adminMiddleware, productController.resetAllProductStock);

// Bulk update stock by carrier (single DB call)
router.patch('/bulk-stock-by-carrier', authMiddleware, adminMiddleware, productController.bulkUpdateStockByCarrier);

// Bulk update shop stock (open/close all)
router.patch('/bulk-shop-stock', authMiddleware, adminMiddleware, productController.bulkUpdateShopStock);

// Toggle agent visibility for a single product
router.put('/toggle-agent/:id', authMiddleware, adminMiddleware, productController.toggleAgentVisibility);

// Bulk update agent visibility (optionally filtered by carrier)
router.patch('/bulk-agent-visibility', authMiddleware, adminMiddleware, productController.bulkUpdateAgentVisibility);

// Toggle promo price for a single product
router.put('/toggle-promo/:id', authMiddleware, adminMiddleware, productController.togglePromoPrice);

// Bulk switch between main and promo prices
router.patch('/bulk-toggle-promo', authMiddleware, adminMiddleware, productController.bulkTogglePromoPrice);

// Admin: Delete product
router.delete('/delete/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
