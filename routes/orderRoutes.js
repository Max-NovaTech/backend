const express = require('express');
const orderController = require('../controllers/orderController'); // Import controller
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Download Excel template for order upload
const templatePath = path.join(__dirname, '../uploads/order_upload_template.xlsx');

// Route to download the Excel template
const router = express.Router();
router.get('/download-template', (req, res) => {
  res.download(templatePath, 'order_upload_template.xlsx');
});

// Excel upload for agent orders
router.post('/upload-excel', authMiddleware, upload.single('file'), orderController.uploadExcelOrders);

// User: Submit cart as an order
router.post('/submit', authMiddleware, orderController.submitCart);

router.get('/download-simplified-template', authMiddleware, orderController.downloadSimplifiedTemplate);
router.post('/upload-simplified', authMiddleware, upload.single('file'), orderController.uploadSimplifiedExcelOrders);

// Admin: Process an order (update status)
router.put('/admin/process/:orderId', authMiddleware, adminMiddleware, orderController.processOrderController);

router.post('/admin/process/order', authMiddleware, adminMiddleware, orderController.processOrderItem);

router.get('/admin/allorder', authMiddleware, adminMiddleware, orderController.getOrderStatus);

router.get("/admin/:userId", authMiddleware, orderController.getOrderHistory);

// Get specific order by ID for status sync
router.get("/status/:orderId", authMiddleware, orderController.getOrderById);

// User: View completed orders
router.get('/user/completed/:userId', authMiddleware, orderController.getUserCompletedOrdersController);

router.put('/orders/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderItemsStatus);
router.put('/items/:itemId/status', authMiddleware, adminMiddleware, orderController.updateSingleOrderItemStatus);

// Direct order creation from ext_agent system
router.post('/create-direct', authMiddleware, orderController.createDirectOrder);

// Get multiple orders by IDs for GB calculation
router.post('/admin/orders-by-ids', authMiddleware, adminMiddleware, orderController.getOrdersByIds);

// Batch complete all processing orders
router.post('/admin/batch-complete', authMiddleware, adminMiddleware, orderController.batchCompleteProcessing);

// Download orders for Excel export and update pending to processing (requires admin)
router.get('/admin/download-excel', authMiddleware, adminMiddleware, orderController.downloadOrdersForExcel);

module.exports = router;