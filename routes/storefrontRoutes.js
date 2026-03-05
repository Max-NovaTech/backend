const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefrontController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// ==================== AGENT STOREFRONT MANAGEMENT ====================

// Get or create storefront slug
router.get('/agent/:userId/slug', authMiddleware, storefrontController.getStorefrontSlug);

// Get available products for storefront (filtered by agent role)
router.get('/agent/:userId/products/available', authMiddleware, storefrontController.getAvailableProducts);

// Get agent's storefront products
router.get('/agent/:userId/products', authMiddleware, storefrontController.getAgentStorefrontProducts);

// Add product to storefront
router.post('/agent/:userId/products', authMiddleware, storefrontController.addProductToStorefront);

// Update product price
router.put('/agent/:userId/products/:productId', authMiddleware, storefrontController.updateProductPrice);

// Remove product from storefront
router.delete('/agent/:userId/products/:productId', authMiddleware, storefrontController.removeProduct);

// Toggle product active status
router.patch('/agent/:userId/products/:productId/toggle', authMiddleware, storefrontController.toggleProduct);

// Get agent's referral summary
router.get('/agent/:userId/referrals', authMiddleware, storefrontController.getAgentReferralSummary);

// ==================== PUBLIC STOREFRONT ====================

// Get public storefront by slug
router.get('/public/:slug', storefrontController.getPublicStorefront);

// Initialize referral payment
router.post('/public/:slug/pay', storefrontController.initializeReferralPayment);

// Verify referral payment
router.post('/verify', storefrontController.verifyReferralPayment);

// ==================== ADMIN FUNCTIONS ====================

// Get all referral orders
router.get('/admin/referrals', authMiddleware, adminMiddleware, storefrontController.getAllReferralOrders);

// Mark commissions as paid
router.post('/admin/commissions/pay', authMiddleware, adminMiddleware, storefrontController.markCommissionsPaid);

// Get weekly commission summary
router.get('/admin/commissions/weekly', authMiddleware, adminMiddleware, storefrontController.getWeeklyCommissionSummary);

module.exports = router;
