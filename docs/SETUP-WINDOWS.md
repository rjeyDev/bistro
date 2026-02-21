# BayTown Backend – Setup on Windows (from zero)

Step-by-step guide to run this NestJS backend on a Windows PC: Node.js, PostgreSQL, pgAdmin, and the app.

---

## 1. Install Node.js (LTS)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (e.g. "22.x.x LTS").
3. Run the installer (`.msi`).
4. Accept the license, keep default options. Ensure **"Add to PATH"** is checked.
5. Finish the install. Restart Terminal/PowerShell or open a **new** one.
6. Check:
   ```powershell
   node -v
   npm -v
   ```
   You should see versions (e.g. `v22.x.x` and `10.x.x`).

---

## 2. Install PostgreSQL

1. Go to **https://www.postgresql.org/download/windows/**
2. Click **"Download the installer"** (EDB installer).
3. Download the latest **PostgreSQL 16** (or 15) for Windows x86-64.
4. Run the installer.
5. **Installation Directory:** keep default (e.g. `C:\Program Files\PostgreSQL\16`).
6. **Select Components:** keep **PostgreSQL Server**, **pgAdmin 4**, **Stack Builder** (optional), **Command Line Tools**.
7. **Data Directory:** keep default.
8. **Password:** set a password for the `postgres` user (e.g. `postgres`). Remember it for `.env`.
9. **Port:** keep `5432`.
10. **Locale:** keep default.
11. Finish the install.

**Add PostgreSQL to PATH (optional but useful):**

- Windows Search → "Environment Variables" → "Edit the system environment variables"
- "Environment Variables" → under "System variables" select **Path** → Edit → New
- Add: `C:\Program Files\PostgreSQL\16\bin` (use your version number if different)
- OK → OK. Restart Terminal.

Check (in a new terminal):

```powershell
psql --version
```

---

## 3. pgAdmin (included with PostgreSQL)

pgAdmin 4 is usually installed with PostgreSQL.

1. Start **pgAdmin 4** from the Start Menu.
2. Set a master password when asked (for pgAdmin only; can be simple for local use).
3. In the left tree: **Servers** → **PostgreSQL 16** (or your version).
4. When it asks for the server password, use the **postgres** user password you set in step 2.
5. Optional: check "Save password" for convenience.

**Create the database:**

1. Right-click **Databases** → **Create** → **Database**.
2. **Database:** `baytown`
3. **Owner:** `postgres`
4. Save.

You can run SQL, view tables, and run migrations from here later.

---

## 4. Get the project and install dependencies

If the project is already on your PC (e.g. from Git or a copy):

```powershell
cd C:\path\to\baytown-backend
```

Install dependencies:

```powershell
npm install
```

---

## 5. Environment file (.env)

1. In the project root, copy the template:
   ```powershell
   copy env.template .env
   ```
2. Edit `.env` (Notepad or VS Code). Set at least:
   - `DB_PASSWORD` = the password you set for the `postgres` user in step 2.

Example `.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=baytown
```

Save the file.

---

## 6. Run the backend

**Development (with auto-reload):**

```powershell
npm run start:dev
```

**First time – seed the database (categories, products, sample orders):**

In another terminal, in the same project folder:

```powershell
npm run seed
```

When the app is running you should see something like:

```
[Nest] ... Application is running on: http://localhost:3000
```

- **API base:** http://localhost:3000  
- **Swagger UI:** http://localhost:3000/api  

---

## 7. Empty database – create all tables (no tables yet)

If your **database has no tables** (e.g. fresh Windows install, or you want the same schema as on Mac), run **one** script to create everything:

**Run this file in pgAdmin (Query Tool on database `baytown`):**

- **`migrations/00-full-schema.sql`**

It creates in the right order: enums → categories → products → modificators → product_modificators → orders → order_items → order_item_modificators → images → printers. After that, the backend should start without “relation/table does not exist” errors.

Then (optional) seed sample data: `npm run seed`.

---

## 8. After pulling updates – run new migrations (important)

If you **pushed/pulled** the latest code but **did not run the SQL migrations**, the database is missing new columns and tables. The backend will then throw errors (e.g. missing column `notes`, `deliveryPrice`, `printerId`, `deletedAt`, or table `printers`).

**You need to run the migration SQL files** on your Windows PC in the `baytown` database. Run them in this order:

| Order | File | What it adds |
|-------|------|----------------|
| 1 | `migrations/add-modificators.sql` | Modificators support (if not already run) |
| 2 | `migrations/alter-modificators-names-to-lang.sql` | Modificator name columns |
| 3 | `migrations/add-order-notes.sql` | `orders.notes` |
| 4 | `migrations/add-orders-delivery-price.sql` | `orders.deliveryPrice` |
| 5 | `migrations/add-orders-printer-id.sql` | `orders.printerId` |
| 6 | `migrations/add-printers-table.sql` | `printers` table |
| 7 | `migrations/add-products-soft-delete.sql` | `products.deletedAt` |
| 8 | `migrations/add-modificators-soft-delete.sql` | `modificators.deletedAt` |

**Option A – pgAdmin (easiest on Windows)**

1. Open **pgAdmin** → connect to your server → right‑click database **baytown** → **Query Tool**.
2. For each file above, open it (File → Open or paste contents), then run it (F5 or ▶).
3. Start with the first; if a migration was already applied, it may say “column already exists” or “table already exists” – that’s OK (many use `IF NOT EXISTS`).

**Option B – psql (if PostgreSQL bin is in PATH)**

From the project folder, run each file:

```powershell
cd C:\path\to\baytown-backend
psql -U postgres -d baytown -f migrations/add-order-notes.sql
psql -U postgres -d baytown -f migrations/add-orders-delivery-price.sql
psql -U postgres -d baytown -f migrations/add-orders-printer-id.sql
psql -U postgres -d baytown -f migrations/add-printers-table.sql
psql -U postgres -d baytown -f migrations/add-products-soft-delete.sql
psql -U postgres -d baytown -f migrations/add-modificators-soft-delete.sql
```

(Skip `add-modificators.sql` and `alter-modificators-names-to-lang.sql` if your DB was already set up with modificators.)

After all migrations have been run, start the backend again: `npm run start:dev`.

**Copy-paste SQL for missing columns only (if you already have tables):**

If you prefer to run the commands directly, execute these in order (one block at a time, or all together):

```sql
-- 1. Order notes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Order delivery price
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 3. Order active printer
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "printerId" INTEGER NULL;

-- 4. Printers table
CREATE TABLE IF NOT EXISTS printers (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "name" VARCHAR(255) NOT NULL,
  "ip" VARCHAR(45) NOT NULL,
  "isKitchen" BOOLEAN NOT NULL DEFAULT false
);

-- 5. Products soft delete
ALTER TABLE products ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- 6. Modificators soft delete
ALTER TABLE modificators ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
```

---

## Quick reference

| What              | Command / URL                          |
|-------------------|----------------------------------------|
| Start dev server  | `npm run start:dev`                     |
| Seed DB           | `npm run seed`                          |
| Build             | `npm run build`                         |
| Run production    | `npm run start:prod`                    |
| API docs (Swagger)| http://localhost:3000/api              |
| DB GUI            | pgAdmin 4 (from Start Menu)             |

---

## Troubleshooting

**"Unable to connect to database"**  
Do these in order:

1. **Create a `.env` file** in the project root (copy from `env.template`). The app reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` from `.env`. Without it, connection often fails or uses wrong defaults.
   ```powershell
   copy env.template .env
   ```
2. **Start PostgreSQL:**  
   - Press **Win + R**, type `services.msc`, Enter.  
   - Find **postgresql-x64-16** (or your version).  
   - Right-click → **Start** (set to Automatic so it starts with Windows if you want).
3. **Use the correct password in `.env`:**  
   - Open `.env` and set `DB_PASSWORD=` to the **exact** password you set for the `postgres` user when you installed PostgreSQL.  
   - Default in the template is `postgres`; if you chose something else, change it.
4. **Create the database:**  
   - Open **pgAdmin** → connect to your server → right-click **Databases** → **Create** → **Database** → name: `baytown` → Save.
5. **Check port:**  
   - In `.env`, `DB_PORT=5432` is the default. If PostgreSQL uses another port, change it.
6. **Install dependencies** (needed for `.env` loading):  
   ```powershell
   npm install
   ```
   Then run the app again: `npm run start:dev`.

**"node is not recognized"**  
- Reinstall Node.js and ensure "Add to PATH" is checked, then open a **new** terminal.

**"psql is not recognized"**  
- Add `C:\Program Files\PostgreSQL\16\bin` to system PATH (see step 2), or use pgAdmin to run SQL.

**Database connection refused / ECONNREFUSED**  
- PostgreSQL service must be running:  
  - **Services** (Win + R → `services.msc`) → find **postgresql-x64-16** → Start.  
- Check `DB_HOST=localhost`, `DB_PORT=5432`, and that the database `baytown` exists.

**"password authentication failed for user postgres"**  
- Fix `DB_PASSWORD` in `.env` to match the postgres user password you set during PostgreSQL install.

**Port 3000 already in use**  
- Change `PORT=3001` (or another free port) in `.env`.

**Migrations / schema out of date**  
- In development, TypeORM can create/update tables automatically.  
- If you use SQL migration files, run them in pgAdmin or with `psql -U postgres -d baytown -f migrations/your-file.sql`.

---

Once these steps are done, you have Node.js, PostgreSQL, pgAdmin, and the BayTown backend running on Windows from zero.


# If you use a migration runner, run it. Otherwise run manually:
psql -d your_database -f migrations/make-order-number-nullable.sql