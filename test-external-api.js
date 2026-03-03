/**
 * Comprehensive stress test for the External API system
 * Tests: Auth, API Key Management, Order Creation, Order Status, Edge Cases
 */
const axios = require('axios');

const BASE = 'http://localhost:5000';
let adminToken = null;
let testApiKey = null;
let testApiKeyId = null;
let testApiKey2 = null;
let testApiKeyId2 = null;
let createdOrderIds = [];

let passed = 0;
let failed = 0;

const log = (status, test, detail = '') => {
  if (status === 'PASS') {
    passed++;
    console.log(`  ✅ ${test}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${test}${detail ? ' — ' + detail : ''}`);
  }
};

const api = axios.create({ baseURL: BASE, validateStatus: () => true });

async function getAdminToken() {
  const res = await api.post('/api/auth/login', { email: 'admin@gmail.com', password: 'admin' });
  if (res.status === 200 && res.data?.token) {
    return res.data.token;
  }
  return null;
}

async function testAuthEdgeCases() {
  console.log('\n🔐 === AUTH EDGE CASES ===');

  // 1. No API key header
  const r1 = await api.get('/api/external/products');
  log(r1.status === 401 ? 'PASS' : 'FAIL', 'No API key → 401', `status=${r1.status}`);

  // 2. Empty API key
  const r2 = await api.get('/api/external/products', { headers: { 'x-api-key': '' } });
  log(r2.status === 401 ? 'PASS' : 'FAIL', 'Empty API key → 401', `status=${r2.status}`);

  // 3. Random invalid API key
  const r3 = await api.get('/api/external/products', { headers: { 'x-api-key': 'nvt_invalidkey123456' } });
  log(r3.status === 401 ? 'PASS' : 'FAIL', 'Invalid API key → 401', `status=${r3.status}`);

  // 4. SQL injection attempt in API key
  const r4 = await api.get('/api/external/products', { headers: { 'x-api-key': "' OR 1=1 --" } });
  log(r4.status === 401 ? 'PASS' : 'FAIL', 'SQL injection in API key → 401', `status=${r4.status}`);
}

async function testAdminKeyManagement() {
  console.log('\n🔑 === ADMIN KEY MANAGEMENT ===');

  const headers = { Authorization: `Bearer ${adminToken}` };

  // 1. Create API key - missing partnerName
  const r1 = await api.post('/api/external/admin/keys', {}, { headers });
  log(r1.status === 400 ? 'PASS' : 'FAIL', 'Create key without name → 400', `status=${r1.status}`);

  // 2. Create API key - empty partnerName
  const r2 = await api.post('/api/external/admin/keys', { partnerName: '   ' }, { headers });
  log(r2.status === 400 ? 'PASS' : 'FAIL', 'Create key with whitespace name → 400', `status=${r2.status}`);

  // 3. Create API key - valid
  const r3 = await api.post('/api/external/admin/keys', { partnerName: 'Test Partner 1' }, { headers });
  log(r3.status === 201 && r3.data?.data?.apiKey ? 'PASS' : 'FAIL', 'Create key for Partner 1 → 201', `key=${r3.data?.data?.apiKey?.substring(0, 12)}...`);
  if (r3.data?.data) {
    testApiKey = r3.data.data.apiKey;
    testApiKeyId = r3.data.data.id;
  }

  // 4. Create second API key
  const r4 = await api.post('/api/external/admin/keys', { partnerName: 'Test Partner 2' }, { headers });
  log(r4.status === 201 && r4.data?.data?.apiKey ? 'PASS' : 'FAIL', 'Create key for Partner 2 → 201');
  if (r4.data?.data) {
    testApiKey2 = r4.data.data.apiKey;
    testApiKeyId2 = r4.data.data.id;
  }

  // 5. List API keys
  const r5 = await api.get('/api/external/admin/keys', { headers });
  const keys = r5.data?.data || [];
  log(r5.status === 200 && keys.length >= 2 ? 'PASS' : 'FAIL', 'List keys → has at least 2 keys', `count=${keys.length}`);

  // 6. Verify key is masked in list
  const listed = keys.find(k => k.id === testApiKeyId);
  log(listed && listed.apiKeyPreview && !listed.apiKey ? 'PASS' : 'FAIL', 'Listed key is masked (no full key exposed)');

  // 7. Revoke key
  const r7 = await api.patch(`/api/external/admin/keys/${testApiKeyId2}/revoke`, {}, { headers });
  log(r7.status === 200 ? 'PASS' : 'FAIL', 'Revoke Partner 2 key → 200', `status=${r7.status}`);

  // 8. Verify revoked key is listed as inactive
  const r8 = await api.get('/api/external/admin/keys', { headers });
  const revokedKey = (r8.data?.data || []).find(k => k.id === testApiKeyId2);
  log(revokedKey && revokedKey.isActive === false ? 'PASS' : 'FAIL', 'Revoked key shows as inactive');

  // 9. Test revoked key cannot access partner endpoints
  const r9 = await api.get('/api/external/products', { headers: { 'x-api-key': testApiKey2 } });
  log(r9.status === 403 ? 'PASS' : 'FAIL', 'Revoked key → 403 on partner endpoint', `status=${r9.status}`);

  // 10. Reactivate key
  const r10 = await api.patch(`/api/external/admin/keys/${testApiKeyId2}/activate`, {}, { headers });
  log(r10.status === 200 ? 'PASS' : 'FAIL', 'Reactivate Partner 2 key → 200');

  // 11. Verify reactivated key works
  const r11 = await api.get('/api/external/products', { headers: { 'x-api-key': testApiKey2 } });
  log(r11.status === 200 ? 'PASS' : 'FAIL', 'Reactivated key works again → 200', `status=${r11.status}`);

  // 12. Admin endpoints require JWT - no token
  const r12 = await api.get('/api/external/admin/keys');
  log(r12.status === 401 || r12.status === 403 ? 'PASS' : 'FAIL', 'Admin list without JWT → 401/403', `status=${r12.status}`);

  // 13. Admin endpoints require JWT - partner key is not enough
  const r13 = await api.get('/api/external/admin/keys', { headers: { 'x-api-key': testApiKey } });
  log(r13.status === 401 || r13.status === 403 ? 'PASS' : 'FAIL', 'Admin list with partner key only → 401/403', `status=${r13.status}`);
}

async function testPartnerProducts() {
  console.log('\n📦 === PARTNER - GET PRODUCTS ===');

  const headers = { 'x-api-key': testApiKey };

  // 1. Get products
  const r1 = await api.get('/api/external/products', { headers });
  log(r1.status === 200 && r1.data?.success ? 'PASS' : 'FAIL', 'GET /products → 200', `count=${r1.data?.data?.length || 0}`);

  // 2. Products have required fields
  const products = r1.data?.data || [];
  if (products.length > 0) {
    const p = products[0];
    const hasFields = p.id !== undefined && p.name && p.price !== undefined;
    log(hasFields ? 'PASS' : 'FAIL', 'Product has id, name, price fields', `sample: ${p.name}`);
  } else {
    log('FAIL', 'No products found in database - order tests may fail');
  }
}

async function testPartnerOrders() {
  console.log('\n🛒 === PARTNER - CREATE ORDERS ===');

  const headers = { 'x-api-key': testApiKey };

  // Get a valid product ID first
  const prodRes = await api.get('/api/external/products', { headers });
  const products = prodRes.data?.data || [];
  if (products.length === 0) {
    log('FAIL', 'SKIPPING order tests - no products available');
    return;
  }
  const validProductId = products[0].id;
  const validProductName = products[0].name;
  console.log(`  ℹ️  Using product: ${validProductName} (ID: ${validProductId})`);

  // 1. Create order - missing items
  const r1 = await api.post('/api/external/orders', {}, { headers });
  log(r1.status === 400 ? 'PASS' : 'FAIL', 'Order with no items → 400', `status=${r1.status}`);

  // 2. Create order - empty items array
  const r2 = await api.post('/api/external/orders', { items: [] }, { headers });
  log(r2.status === 400 ? 'PASS' : 'FAIL', 'Order with empty items → 400', `status=${r2.status}`);

  // 3. Create order - item missing productId
  const r3 = await api.post('/api/external/orders', { items: [{ quantity: 1, mobileNumber: '0241234567' }] }, { headers });
  log(r3.status === 400 ? 'PASS' : 'FAIL', 'Item missing productId → 400', `msg=${r3.data?.message}`);

  // 4. Create order - item missing quantity
  const r4 = await api.post('/api/external/orders', { items: [{ productId: validProductId, mobileNumber: '0241234567' }] }, { headers });
  log(r4.status === 400 ? 'PASS' : 'FAIL', 'Item missing quantity → 400', `status=${r4.status}`);

  // 5. Create order - item with zero quantity
  const r5 = await api.post('/api/external/orders', { items: [{ productId: validProductId, quantity: 0, mobileNumber: '0241234567' }] }, { headers });
  log(r5.status === 400 ? 'PASS' : 'FAIL', 'Item with zero quantity → 400', `status=${r5.status}`);

  // 6. Create order - item missing mobileNumber
  const r6 = await api.post('/api/external/orders', { items: [{ productId: validProductId, quantity: 1 }] }, { headers });
  log(r6.status === 400 ? 'PASS' : 'FAIL', 'Item missing mobileNumber → 400', `status=${r6.status}`);

  // 7. Create order - invalid productId
  const r7 = await api.post('/api/external/orders', { items: [{ productId: 999999, quantity: 1, mobileNumber: '0241234567' }] }, { headers });
  log(r7.status === 400 ? 'PASS' : 'FAIL', 'Invalid productId → 400', `msg=${r7.data?.message}`);

  // 8. Create valid single-item order
  const r8 = await api.post('/api/external/orders', {
    items: [{ productId: validProductId, quantity: 1, mobileNumber: '0241234567' }]
  }, { headers });
  log(r8.status === 201 && r8.data?.data?.orderId ? 'PASS' : 'FAIL', 'Valid single-item order → 201', `orderId=${r8.data?.data?.orderId}`);
  if (r8.data?.data?.orderId) createdOrderIds.push(r8.data.data.orderId);

  // 9. Verify order response structure
  const order = r8.data?.data;
  if (order) {
    const hasFields = order.orderId && order.status && order.totalPrice !== undefined && order.items && order.createdAt;
    log(hasFields ? 'PASS' : 'FAIL', 'Order response has all required fields');
    log(order.status === 'Pending' ? 'PASS' : 'FAIL', 'Order status is Pending', `status=${order.status}`);
    log(order.items.length === 1 ? 'PASS' : 'FAIL', 'Order has 1 item', `count=${order.items.length}`);
  }

  // 10. Create multi-item order
  const secondProduct = products.length > 1 ? products[1].id : validProductId;
  const r10 = await api.post('/api/external/orders', {
    items: [
      { productId: validProductId, quantity: 2, mobileNumber: '0241234567' },
      { productId: secondProduct, quantity: 1, mobileNumber: '0551234567' }
    ]
  }, { headers });
  log(r10.status === 201 && r10.data?.data?.orderId ? 'PASS' : 'FAIL', 'Multi-item order → 201', `orderId=${r10.data?.data?.orderId}`);
  if (r10.data?.data?.orderId) createdOrderIds.push(r10.data.data.orderId);

  // 11. Verify multi-item order has correct item count
  const multiOrder = r10.data?.data;
  if (multiOrder) {
    log(multiOrder.items.length === 2 ? 'PASS' : 'FAIL', 'Multi-item order has 2 items', `count=${multiOrder.items.length}`);
  }

  // 12. Create order with quantity > 1
  const r12 = await api.post('/api/external/orders', {
    items: [{ productId: validProductId, quantity: 5, mobileNumber: '0201234567' }]
  }, { headers });
  log(r12.status === 201 ? 'PASS' : 'FAIL', 'Order with quantity=5 → 201', `orderId=${r12.data?.data?.orderId}`);
  if (r12.data?.data?.orderId) createdOrderIds.push(r12.data.data.orderId);

  // 13. Verify totalPrice calculation
  if (r12.data?.data) {
    const expectedPrice = products[0].price * 5;
    log(r12.data.data.totalPrice === expectedPrice ? 'PASS' : 'FAIL', `Total price = ${r12.data.data.totalPrice} (expected ${expectedPrice})`);
  }

  // 14. Create order using Partner 2's key
  const r14 = await api.post('/api/external/orders', {
    items: [{ productId: validProductId, quantity: 1, mobileNumber: '0271234567' }]
  }, { headers: { 'x-api-key': testApiKey2 } });
  log(r14.status === 201 ? 'PASS' : 'FAIL', 'Partner 2 can also create orders → 201');

  // 15. Non-JSON body
  const r15 = await api.post('/api/external/orders', 'not json', { headers: { ...headers, 'Content-Type': 'text/plain' } });
  log(r15.status === 400 ? 'PASS' : 'FAIL', 'Non-JSON body → 400', `status=${r15.status}`);
}

async function testOrderStatus() {
  console.log('\n📋 === PARTNER - ORDER STATUS ===');

  const headers = { 'x-api-key': testApiKey };

  if (createdOrderIds.length === 0) {
    log('FAIL', 'SKIPPING status tests - no orders were created');
    return;
  }

  // 1. Get single order status
  const r1 = await api.get(`/api/external/orders/${createdOrderIds[0]}`, { headers });
  log(r1.status === 200 && r1.data?.data?.orderId ? 'PASS' : 'FAIL', 'GET /orders/:id → 200', `orderId=${r1.data?.data?.orderId}`);

  // 2. Verify response structure
  const order = r1.data?.data;
  if (order) {
    log(order.orderId === createdOrderIds[0] ? 'PASS' : 'FAIL', 'Returned correct orderId');
    log(order.items && order.items.length > 0 ? 'PASS' : 'FAIL', 'Has items array');
    log(order.createdAt ? 'PASS' : 'FAIL', 'Has createdAt timestamp');
  }

  // 3. Non-existent order
  const r3 = await api.get('/api/external/orders/999999', { headers });
  log(r3.status === 404 ? 'PASS' : 'FAIL', 'Non-existent order → 404', `status=${r3.status}`);

  // 4. Invalid order ID format
  const r4 = await api.get('/api/external/orders/abc', { headers });
  log(r4.status === 404 || r4.status === 400 ? 'PASS' : 'FAIL', 'Invalid orderId "abc" → 404/400', `status=${r4.status}`);

  // 5. Bulk status - valid
  const r5 = await api.post('/api/external/orders/status', { orderIds: createdOrderIds }, { headers });
  log(r5.status === 200 && r5.data?.data?.length === createdOrderIds.length ? 'PASS' : 'FAIL', 'Bulk status → returns all orders', `requested=${createdOrderIds.length}, returned=${r5.data?.data?.length}`);

  // 6. Bulk status - empty array
  const r6 = await api.post('/api/external/orders/status', { orderIds: [] }, { headers });
  log(r6.status === 400 ? 'PASS' : 'FAIL', 'Bulk status with empty array → 400', `status=${r6.status}`);

  // 7. Bulk status - missing orderIds
  const r7 = await api.post('/api/external/orders/status', {}, { headers });
  log(r7.status === 400 ? 'PASS' : 'FAIL', 'Bulk status missing orderIds → 400', `status=${r7.status}`);

  // 8. Bulk status - over 50 limit
  const bigArray = Array.from({ length: 51 }, (_, i) => i + 1);
  const r8 = await api.post('/api/external/orders/status', { orderIds: bigArray }, { headers });
  log(r8.status === 400 ? 'PASS' : 'FAIL', 'Bulk status >50 IDs → 400', `status=${r8.status}`);

  // 9. Bulk status - mix of valid and invalid
  const r9 = await api.post('/api/external/orders/status', { orderIds: [...createdOrderIds, 999999] }, { headers });
  log(r9.status === 200 ? 'PASS' : 'FAIL', 'Bulk status with mix of valid/invalid → 200', `returned=${r9.data?.data?.length}`);
}

async function testTotalOrdersCounter() {
  console.log('\n📊 === TOTAL ORDERS COUNTER ===');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const r1 = await api.get('/api/external/admin/keys', { headers: adminHeaders });
  const key1 = (r1.data?.data || []).find(k => k.id === testApiKeyId);
  // Partner 1 created 3 orders (single, multi, qty5)
  log(key1 && key1.totalOrders >= 3 ? 'PASS' : 'FAIL', `Partner 1 totalOrders counter`, `count=${key1?.totalOrders}`);

  const key2 = (r1.data?.data || []).find(k => k.id === testApiKeyId2);
  // Partner 2 created 1 order
  log(key2 && key2.totalOrders >= 1 ? 'PASS' : 'FAIL', `Partner 2 totalOrders counter`, `count=${key2?.totalOrders}`);
}

async function testCleanup() {
  console.log('\n🧹 === CLEANUP ===');

  const headers = { Authorization: `Bearer ${adminToken}` };

  // Delete test keys
  if (testApiKeyId) {
    const r1 = await api.delete(`/api/external/admin/keys/${testApiKeyId}`, { headers });
    log(r1.status === 200 ? 'PASS' : 'FAIL', 'Delete Partner 1 key', `status=${r1.status}`);
  }
  if (testApiKeyId2) {
    const r2 = await api.delete(`/api/external/admin/keys/${testApiKeyId2}`, { headers });
    log(r2.status === 200 ? 'PASS' : 'FAIL', 'Delete Partner 2 key', `status=${r2.status}`);
  }

  // Verify deleted keys no longer work
  if (testApiKey) {
    const r3 = await api.get('/api/external/products', { headers: { 'x-api-key': testApiKey } });
    log(r3.status === 401 ? 'PASS' : 'FAIL', 'Deleted key → 401', `status=${r3.status}`);
  }

  // Verify keys are gone from list
  const r4 = await api.get('/api/external/admin/keys', { headers });
  const remaining = (r4.data?.data || []).filter(k => k.id === testApiKeyId || k.id === testApiKeyId2);
  log(remaining.length === 0 ? 'PASS' : 'FAIL', 'Deleted keys gone from list', `remaining=${remaining.length}`);
}

async function run() {
  console.log('🚀 External API Stress Test Suite\n');
  console.log('Connecting to:', BASE);

  // Get admin token
  adminToken = await getAdminToken();
  if (!adminToken) {
    console.log('\n❌ Cannot get admin token. Need valid admin credentials to test.');
    console.log('   Tried: admin@novatech.com / admin@admin.com with password admin123');
    console.log('   Please set valid admin credentials in this test file.');
    process.exit(1);
  }
  console.log('✅ Admin token acquired\n');

  try {
    await testAuthEdgeCases();
    await testAdminKeyManagement();
    await testPartnerProducts();
    await testPartnerOrders();
    await testOrderStatus();
    await testTotalOrdersCounter();
    await testCleanup();
  } catch (err) {
    console.error('\n💥 Unexpected error:', err.message);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'='.repeat(50)}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

run();
