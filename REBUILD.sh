#!/bin/bash
echo "🧹 Cleaning build directory..."
rm -rf dist

echo "🔨 Building project..."
npm run build

echo "🚀 Starting server..."
npm run start:dev

