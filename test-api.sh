#!/bin/bash

echo "🧪 Testing API Endpoints..."
echo ""

echo "1️⃣ Testing GET /products"
curl -s http://localhost:3000/products | head -c 200
echo ""
echo ""

echo "2️⃣ Testing GET /orders"
curl -s http://localhost:3000/orders | head -c 200
echo ""
echo ""

echo "3️⃣ Testing Swagger JSON"
curl -s http://localhost:3000/api-json | head -c 500
echo ""
echo ""

echo "✅ Tests complete!"

