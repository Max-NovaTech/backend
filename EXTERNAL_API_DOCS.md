# Novatech External Partner API

Base URL: `https://your-backend-url.com/api/external`

## Authentication

All requests must include your API key in the header:

```
x-api-key: your_api_key_here
```

---

## Endpoints

### 1. Get Available Products

Fetch all products available for ordering.

**GET** `/products`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "MTN 1GB Daily",
      "description": "1GB data valid for 24 hours",
      "price": 5.00,
      "stock": 100
    }
  ]
}
```

---

### 2. Place an Order

Submit one or more items as an order for processing.

**POST** `/orders`

**Headers:**
```
Content-Type: application/json
x-api-key: your_api_key_here
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "mobileNumber": "0241234567"
    },
    {
      "productId": 3,
      "quantity": 2,
      "mobileNumber": "0551234567"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | Yes | Array of order items |
| items[].productId | number | Yes | Product ID (from /products endpoint) |
| items[].quantity | number | Yes | Quantity (minimum 1) |
| items[].mobileNumber | string | Yes | Recipient mobile number |

**Response (201):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderId": 456,
    "status": "Pending",
    "totalPrice": 15.00,
    "items": [
      {
        "id": 1001,
        "productId": 1,
        "productName": "MTN 1GB Daily",
        "quantity": 1,
        "price": 5.00,
        "mobileNumber": "0241234567",
        "status": "Pending"
      }
    ],
    "createdAt": "2025-03-03T10:30:00.000Z"
  }
}
```

**Save the `orderId`** — you'll need it to check the order status later.

---

### 3. Check Single Order Status

**GET** `/orders/:orderId`

**Example:** `GET /orders/456`

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": 456,
    "status": "Pending",
    "items": [
      {
        "id": 1001,
        "productId": 1,
        "productName": "MTN 1GB Daily",
        "quantity": 1,
        "productPrice": 5.00,
        "mobileNumber": "0241234567",
        "status": "Completed",
        "updatedAt": "2025-03-03T10:35:00.000Z"
      }
    ],
    "createdAt": "2025-03-03T10:30:00.000Z"
  }
}
```

**Possible item statuses:** `Pending`, `Processing`, `Completed`, `Cancelled`

---

### 4. Check Multiple Order Statuses (Bulk)

**POST** `/orders/status`

**Request Body:**
```json
{
  "orderIds": [456, 457, 458]
}
```

Maximum 50 order IDs per request.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": 456,
      "status": "Pending",
      "items": [...],
      "createdAt": "2025-03-03T10:30:00.000Z"
    }
  ]
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Description of the error"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Bad request (missing/invalid fields) |
| 401 | Missing or invalid API key |
| 403 | API key has been revoked |
| 404 | Resource not found |
| 500 | Server error |

---

## Example Integration (JavaScript/Node.js)

```javascript
const axios = require('axios');

const API_BASE = 'https://your-backend-url.com/api/external';
const API_KEY = 'your_api_key_here';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'x-api-key': API_KEY }
});

// 1. Get products
const { data: products } = await api.get('/products');
console.log(products.data);

// 2. Place an order
const { data: order } = await api.post('/orders', {
  items: [
    { productId: 1, quantity: 1, mobileNumber: '0241234567' }
  ]
});
console.log('Order ID:', order.data.orderId);

// 3. Check order status
const { data: status } = await api.get(`/orders/${order.data.orderId}`);
console.log('Status:', status.data.items[0].status);
```

## Example Integration (Python)

```python
import requests

API_BASE = 'https://your-backend-url.com/api/external'
API_KEY = 'your_api_key_here'
headers = {'x-api-key': API_KEY}

# 1. Get products
products = requests.get(f'{API_BASE}/products', headers=headers).json()

# 2. Place an order
order = requests.post(f'{API_BASE}/orders', headers=headers, json={
    'items': [
        {'productId': 1, 'quantity': 1, 'mobileNumber': '0241234567'}
    ]
}).json()

# 3. Check order status
status = requests.get(f'{API_BASE}/orders/{order["data"]["orderId"]}', headers=headers).json()
```
