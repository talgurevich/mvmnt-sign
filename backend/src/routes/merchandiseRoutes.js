/**
 * Merchandise Routes
 * Public and admin routes for merchandise orders
 */

const express = require('express');
const router = express.Router();
const merchandiseController = require('../controllers/merchandiseController');
const { requireAuth } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/products', merchandiseController.getProducts);
router.post('/orders', merchandiseController.createOrder);

// Admin routes (require auth)
router.get('/orders', requireAuth, merchandiseController.getOrders);
router.get('/orders/:id', requireAuth, merchandiseController.getOrder);
router.patch('/orders/:id', requireAuth, merchandiseController.updateOrderStatus);
router.delete('/orders/:id', requireAuth, merchandiseController.deleteOrder);

module.exports = router;
