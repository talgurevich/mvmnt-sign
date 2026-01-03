const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Supplier costs
const COSTS = {
  'קפוצון בלי רוכסן': 60,
  'קפוצון עם רוכסן': 65,
  'כובע צמר': 25,
  'כובע מצחיה': 25,
  'מגבת': 25,
  'חולצה': 30,
  'חולצת דרייפיט': 30
};

async function calculateCost() {
  const { data: orders, error } = await supabase
    .from('merchandise_orders')
    .select('*')
    .neq('status', 'cancelled');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const summary = {};
  let totalCost = 0;

  orders.forEach(order => {
    order.items.forEach(item => {
      if (!summary[item.name]) {
        summary[item.name] = { quantity: 0, cost: 0 };
      }
      const cost = COSTS[item.name] || 0;
      summary[item.name].quantity += item.quantity;
      summary[item.name].cost += cost * item.quantity;
      totalCost += cost * item.quantity;
    });
  });

  console.log('עלות הזמנה:\n');
  for (const [product, data] of Object.entries(summary).sort()) {
    const unitCost = COSTS[product] || 0;
    console.log(`${product}: ${data.quantity} יח' × ${unitCost}₪ = ${data.cost}₪`);
  }
  console.log('\n--------------------');
  console.log(`סה"כ עלות: ${totalCost}₪`);
}

calculateCost();
