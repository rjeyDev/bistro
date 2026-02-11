# BayTown FastFood Backend

A NestJS-based backend system for managing a fast food ordering system with real-time WebSocket notifications.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env` file has been created with default values:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=baytown
```

**Important:** Update `DB_PASSWORD` and other values to match your PostgreSQL setup.

### 3. Create Database
```bash
# Using psql
createdb baytown

# Or via psql command line
psql -U postgres
CREATE DATABASE baytown;
\q
```

### 4. Seed the Database
```bash
npm run seed
```

This will create:
- 3 categories (Burgers, Sides, Beverages)
- 5 products
- 2 sample orders

### 5. Run the Application
```bash
# Development mode with auto-reload
npm run start:dev

# Or production build
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the application is running, access Swagger UI at:

**http://localhost:3000/api**

## 🔌 WebSocket

WebSocket server runs on the same port. Connect to receive real-time order notifications:

```javascript
// Client connection example
const socket = io('http://localhost:3000');

socket.on('new_order', (order) => {
  console.log('New order received:', order);
});
```

## 📡 API Endpoints

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create new product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Orders
- `GET /orders` - Get all orders (supports `?status=Pending` filter)
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create new order
- `PATCH /orders/:id/accept` - Accept pending order
- `PATCH /orders/:id/cancel` - Cancel order
- `PATCH /orders/:id/complete` - Complete order

## 🗂️ Project Structure

```
src/
├── common/              # Shared entities (BaseEntity)
├── products/            # Product & Category modules
│   ├── dto/
│   ├── category.entity.ts
│   ├── product.entity.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── orders/              # Order management
│   ├── dto/
│   ├── enums/
│   ├── order.entity.ts
│   ├── order-item.entity.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.gateway.ts
│   └── orders.module.ts
├── scripts/             # Database seeding
│   └── seed.ts
├── app.module.ts
└── main.ts
```

## 🛠️ Available Scripts

```bash
npm run start:dev        # Start development server
npm run build            # Build for production
npm run start:prod       # Start production server
npm run seed             # Seed database with sample data
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run test             # Run tests
```

## 🗄️ Database Schema

### Entities
- **Category** - Product categories
- **Product** - Menu items (related to Category)
- **Order** - Customer orders
- **OrderItem** - Individual items in an order (related to Order & Product)

### Relationships
- Category → Products (One-to-Many)
- Order → OrderItems (One-to-Many)
- Product → OrderItems (One-to-Many)

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USERNAME` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `DB_NAME` | Database name | baytown |

## 📝 Notes

- TypeORM `synchronize` is enabled in development (automatically creates/updates tables)
- Disable `synchronize` in production and use migrations instead
- WebSocket CORS is enabled for development
- Global validation pipe with whitelist enabled

## 🧪 Testing with Swagger

1. Start the server: `npm run start:dev`
2. Open browser: http://localhost:3000/api
3. Test the endpoints directly in Swagger UI
4. Create categories first, then products, then orders

Happy coding! 🎉
