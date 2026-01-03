/**
 * Merchandise Controller
 * Handles product orders for hats and hoodies
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { sendNewOrderNotification } = require('../services/notifications');

// Product catalog (hardcoded)
const PRODUCTS = [
  {
    id: 'wool-hat',
    name: 'כובע צמר',
    price: 50,
    sizes: ['ילדים', 'מבוגרים'],
    colors: ['שחור', 'לבן'],
    image: '/pics/wool-hat.jpg'
  },
  {
    id: 'cap',
    name: 'כובע מצחיה',
    price: 50,
    sizes: ['ילדים', 'מבוגרים'],
    colors: ['שחור', 'לבן'],
    image: '/pics/cap.jpg'
  },
  {
    id: 'hoodie-no-zip',
    name: 'קפוצון בלי רוכסן',
    price: 100,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['שחור', 'אפור', 'לבן'],
    image: '/pics/hoodie-gray.jpg'
  },
  {
    id: 'hoodie-zip',
    name: 'קפוצון עם רוכסן',
    price: 100,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['שחור', 'אפור', 'לבן'],
    image: '/pics/hoodie-zip-gray.jpg'
  },
  {
    id: 'dryfit-shirt',
    name: 'חולצה',
    price: 55,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['אפור', 'שחור'],
    image: '/pics/dryfit-gray.jpg'
  },
  {
    id: 'towel',
    name: 'מגבת',
    price: 70,
    sizes: ['מידה אחת'],
    colors: ['שחור', 'אפור', 'לבן', 'כחול'],
    image: '/pics/towel.jpg'
  }
];

/**
 * Get product catalog (public)
 */
exports.getProducts = catchAsync(async (req, res) => {
  res.json({
    success: true,
    products: PRODUCTS
  });
});

/**
 * Create a new order (public)
 */
exports.createOrder = catchAsync(async (req, res) => {
  const { customer_name, items } = req.body;

  // Validation
  if (!customer_name || !customer_name.trim()) {
    throw new AppError('שם הלקוח הוא שדה חובה', 400);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('יש לבחור לפחות פריט אחד', 400);
  }

  // Validate items and calculate total
  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = PRODUCTS.find(p => p.id === item.product_id);
    if (!product) {
      throw new AppError(`מוצר לא נמצא: ${item.product_id}`, 400);
    }

    if (!product.sizes.includes(item.size)) {
      throw new AppError(`מידה לא תקינה: ${item.size}`, 400);
    }

    if (!product.colors.includes(item.color)) {
      throw new AppError(`צבע לא תקין: ${item.color}`, 400);
    }

    const quantity = item.quantity || 1;
    const itemTotal = product.price * quantity;
    totalAmount += itemTotal;

    validatedItems.push({
      product_id: product.id,
      name: product.name,
      size: item.size,
      color: item.color,
      quantity,
      price: product.price,
      total: itemTotal
    });
  }

  // Create order
  const { data: order, error } = await supabaseAdmin
    .from('merchandise_orders')
    .insert({
      customer_name: customer_name.trim(),
      items: validatedItems,
      total_amount: totalAmount,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('[Merchandise] Error creating order:', error);
    throw new AppError('שגיאה ביצירת ההזמנה', 500);
  }

  // Send notification to admin
  sendNewOrderNotification({
    orderId: order.id,
    customerName: customer_name.trim(),
    items: validatedItems,
    totalAmount
  }).catch(err => console.error('[Merchandise] Notification error:', err));

  res.status(201).json({
    success: true,
    message: 'ההזמנה נשלחה בהצלחה!',
    order: {
      id: order.id,
      total_amount: totalAmount,
      items_count: validatedItems.length
    }
  });
});

/**
 * Get all orders (admin)
 */
exports.getOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('merchandise_orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[Merchandise] Error fetching orders:', error);
    throw new AppError('שגיאה בטעינת ההזמנות', 500);
  }

  res.json({
    success: true,
    orders: data,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get single order (admin)
 */
exports.getOrder = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data: order, error } = await supabaseAdmin
    .from('merchandise_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !order) {
    throw new AppError('הזמנה לא נמצאה', 404);
  }

  res.json({
    success: true,
    order
  });
});

/**
 * Update order status (admin)
 */
exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError('סטטוס לא תקין', 400);
  }

  const { data: order, error } = await supabaseAdmin
    .from('merchandise_orders')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Merchandise] Error updating order:', error);
    throw new AppError('שגיאה בעדכון ההזמנה', 500);
  }

  res.json({
    success: true,
    message: 'ההזמנה עודכנה בהצלחה',
    order
  });
});

/**
 * Delete order (admin)
 */
exports.deleteOrder = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('merchandise_orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Merchandise] Error deleting order:', error);
    throw new AppError('שגיאה במחיקת ההזמנה', 500);
  }

  res.json({
    success: true,
    message: 'ההזמנה נמחקה בהצלחה'
  });
});

module.exports = exports;
