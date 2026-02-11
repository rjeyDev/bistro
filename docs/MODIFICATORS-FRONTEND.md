# Modificators – Frontend Guide

## What are modificators?

**Modificators** are add-ons for products: each has **names in three languages** (`nameTm`, `nameRu`, `nameEn`) and a **price**. They are created globally, then **attached to products**. When a customer orders a product, they can **select zero or more modificators** for that line; the line price becomes **product price + sum of selected modificator prices**.

---

## 1. Modificators CRUD (global list)

Base path: **`/modificators`**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/modificators` | List all modificators |
| `GET` | `/modificators/:id` | Get one modificator |
| `POST` | `/modificators` | Create modificator |
| `PATCH` | `/modificators/:id` | Update modificator |
| `DELETE` | `/modificators/:id` | Delete modificator |

### Create/update body

```json
{
  "nameTm": "Goşundy süýji",
  "nameRu": "Доп. сыр",
  "nameEn": "Extra cheese",
  "price": 1.5
}
```

### Response (single / list item)

```json
{
  "id": 1,
  "createdAt": "2025-02-06T12:00:00.000Z",
  "updatedAt": "2025-02-06T12:00:00.000Z",
  "nameTm": "Goşundy süýji",
  "nameRu": "Доп. сыр",
  "nameEn": "Extra cheese",
  "price": 1.5
}
```

Use this list to build admin UI (create/edit/delete modificators) and to show available add-ons when attaching them to products.

---

## 2. Products and modificators

### Attach modificators to a product

- **Create product:** `POST /products`  
- **Update product:** `PATCH /products/:id`  

Optional field: **`modificatorIds`** (array of modificator IDs).

**Create example:**

```json
{
  "nameTm": "Klassiki burger",
  "nameRu": "Классический бургер",
  "nameEn": "Classic Burger",
  "price": 8.99,
  "categoryId": 1,
  "modificatorIds": [1, 2, 3]
}
```

**Update example (replace product’s modificators):**

```json
{
  "modificatorIds": [1, 2]
}
```

- `modificatorIds` is optional; if omitted on create, product has no modificators.
- On update, sending `modificatorIds` **replaces** the current list (use `[]` to clear).

### Get product (includes modificators)

**`GET /products`** and **`GET /products/:id`** return each product with a **`modificators`** array:

```json
{
  "id": 1,
  "nameEn": "Classic Burger",
  "nameTm": "...",
  "nameRu": "...",
  "price": 8.99,
  "categoryId": 1,
  "modificators": [
    { "id": 1, "nameTm": "...", "nameRu": "Доп. сыр", "nameEn": "Extra cheese", "name": "Extra cheese", "price": 1.5 },
    { "id": 2, "nameTm": "...", "nameRu": "Бекон", "nameEn": "Bacon", "name": "Bacon", "price": 2 }
  ],
  "imageUrl": "...",
  "sortOrder": 0,
  "isAvailable": true,
  "name": "Classic Burger"
}
```

Each modificator has **`nameTm`**, **`nameRu`**, **`nameEn`** and **`price`**. When you pass **`?lang=tm|ru|en`** on `GET /products`, the API also adds a **`name`** field (the name in that language). Use **`product.modificators`** to render add-ons in the product detail/cart. Only these modificators are valid for that product when creating/editing an order.

---

## 3. Orders and modificators

### Create order

**`POST /orders`**

Each item in **`items`** can include **`modificatorIds`** (array of IDs). Those IDs **must** be among the modificators attached to that product, or the API returns 400.

**Request example:**

```json
{
  "type": "DineIn",
  "paymentMethod": "Cash",
  "source": "Kiosk",
  "device": "tablet",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "modificatorIds": [1, 2]
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

- First line: product 1, qty 2, with modificators 1 and 2 (e.g. Extra cheese + Bacon).
- Second line: product 3, qty 1, no modificators.

Order **total** is computed as: for each item, **unit price = product price + sum of selected modificator prices**, then **line total = unit price × quantity**; order total = sum of line totals.

### Get order (itemPrice, totalPrice, modificators)

**`GET /orders`** and **`GET /orders/:id`**

Each **`items[]`** entry includes:

| Field | Type | Meaning |
|-------|------|--------|
| `itemPrice` | number | Product unit price (base price only) |
| `totalPrice` | number | **itemPrice + sum of modificator prices** (unit price including add-ons) |
| `modificators` | array | Snapshot of selected add-ons: `[{ nameTm, nameRu, nameEn, name?, price }, ...]`. **`name`** is set when you pass **`?lang=tm|ru|en`** on `GET /orders` / `GET /orders/:id`. |
| `quantity` | number | Quantity |
| `product` | object | Product with `name` (and other fields) |

**Example item:**

```json
{
  "id": 10,
  "orderId": 5,
  "productId": 1,
  "quantity": 2,
  "price": 8.99,
  "itemPrice": 8.99,
  "totalPrice": 12.49,
  "modificators": [
    { "nameTm": "...", "nameRu": "Доп. сыр", "nameEn": "Extra cheese", "name": "Extra cheese", "price": 1.5 },
    { "nameTm": "...", "nameRu": "Бекон", "nameEn": "Bacon", "name": "Bacon", "price": 2 }
  ],
  "product": {
    "id": 1,
    "nameEn": "Classic Burger",
    "price": 8.99,
    "name": "Classic Burger"
  }
}
```

- **Line total** for display/receipt: **`totalPrice * quantity`** (e.g. 12.49 × 2 = 24.98).
- Use **`itemPrice`** when you need to show “base price” vs “with add-ons”.

### Edit order (add/remove modificators)

**`PATCH /orders/:id`**

Only for orders in **PENDING** or **ACCEPTED** status. Body:

```json
{
  "items": [
    {
      "id": 10,
      "quantity": 3,
      "modificatorIds": [1, 3]
    },
    {
      "id": 11,
      "modificatorIds": []
    }
  ]
}
```

- **`id`** = order item ID (from `GET /orders/:id` → `items[].id`).
- **`quantity`** (optional): new quantity for that line.
- **`modificatorIds`** (optional): **replaces** the current selection for that line. Use `[]` to remove all modificators. IDs must belong to the product of that order item.

After update, the backend recalculates the order total. Response is the full order (same shape as **`GET /orders/:id`**), with updated `itemPrice`, `totalPrice`, `modificators` per item.

---

## 4. Quick reference for UI

| Screen | What to use |
|--------|-------------|
| Admin: modificators list | `GET /modificators`, create/update/delete as above |
| Admin: product form | Load `GET /modificators` for dropdown; send `modificatorIds` in `POST/PATCH /products` |
| Menu / product detail | `product.modificators` from `GET /products` or `GET /products/:id` to show add-ons and prices |
| Cart / checkout | Per line: send `productId`, `quantity`, `modificatorIds` (from selected add-ons for that product) in `POST /orders` |
| Order list / detail | Use `items[].itemPrice`, `items[].totalPrice`, `items[].modificators`, `items[].quantity` to show lines and totals |
| Order edit | Send `PATCH /orders/:id` with `items: [{ id, quantity?, modificatorIds? }]`; then refetch or use returned order |

---

## 5. Validation summary

- **Product create/update:** `modificatorIds` are optional; any IDs that exist in `GET /modificators` are valid.
- **Order create:** For each item, every ID in `modificatorIds` must be in that product’s `modificators` (from product API). Otherwise 400.
- **Order edit:** Same rule: `modificatorIds` for an item must be among the modificators of that item’s product.
- **Order edit** is only allowed when order status is **PENDING** or **ACCEPTED**; otherwise 400.

This is everything the frontend needs to implement modificators end-to-end.
