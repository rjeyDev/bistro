# Testing check printer (receipt printing)

The backend can send the order receipt to a **check printer** over the network when an order is **accepted**. The printer must be on the same LAN and support **raw TCP** printing (most receipt/kitchen printers do on port **9100**).

## Option A: Use .env (quick test)

1. In the project root, ensure your `.env` has:
   ```env
   CHECK_PRINTER_IP=192.168.100.101
   CHECK_PRINTER_PORT=9100
   ```
2. Restart the backend: `npm run start:dev`.
3. Create an order and then accept it (see “Flow to test” below). The receipt will be sent to `192.168.100.101:9100`.

If no printer is added in the **Printers** CRUD with `isKitchen: false`, this IP/port is used.

## Option B: Use Printers CRUD (recommended)

1. Open Swagger: **http://localhost:3000/docs**.
2. **POST /printers** – add a check printer:
   ```json
   {
     "name": "Check Printer",
     "ip": "192.168.100.101",
     "isKitchen": false
   }
   ```
3. When an order is accepted, the receipt is sent to **all** printers where `isKitchen === false` (your check printer).  
   Env `CHECK_PRINTER_IP` is only used when there are **no** such printers in the database.

## Flow to test

1. **Create an order**  
   - Swagger → **POST /orders** (OrderCreate).  
   - Example body (adjust category/product IDs to match your DB):
   ```json
   {
     "type": "DineIn",
     "paymentMethod": "Cash",
     "items": [
       { "productId": 1, "quantity": 2 }
     ],
     "source": "Kiosk",
     "device": "tablet"
   }
   ```
   - Copy the returned order **id** (e.g. `5`).

2. **Accept the order** (this triggers printing)  
   - Swagger → **PATCH /orders/:id/accept** with that `id` (e.g. `5`).  
   - The backend will:
     - Save the order as Accepted.
     - Generate the receipt text.
     - Send it to the check printer at `192.168.100.101:9100` (or to all check printers from the Printers table).

3. **Check the printer**  
   - The receipt should print on the device at `192.168.100.101`.  
   - The same receipt is also logged in the backend console.

## Requirements

- Printer is on the same network as the PC running the backend.
- Printer accepts **raw TCP** on port **9100** (JetDirect / AppSocket). Many receipt and kitchen printers use this.
- Firewall on the PC or printer does not block port 9100.

## Troubleshooting

- **Cut not working**  
  The backend sends **ESC @** (init), then your receipt, then several line feeds, then **GS V m** (cut) as raw bytes. Default is **full cut** (`m=0`). If your printer still doesn’t cut:
  - **Disable cut** and tear by hand: in `.env` set `PRINTER_CUT_ENABLED=false`, restart the app.
  - Try **partial cut**: `PRINTER_CUT_CMD=2` (or `66` on some models).
  - **More feed before cut**: `PRINTER_FEED_LINES=7` (allowed range 3–8; default 5). Restart after changes.
  - Check your printer’s manual for the exact ESC/POS cut command (brands differ: Epson, Star, Bixolon, etc.) and set `PRINTER_CUT_CMD` to the value it expects.

- **"Printer … timeout" in logs**  
  - The backend could not connect to the printer within the timeout (default 10 seconds).  
  - Check: printer is on and on the same network; IP is correct (e.g. from printer display or admin page).  
  - From the PC run: `ping 192.168.100.101`. If ping fails, fix network or IP.  
  - Ensure the printer supports raw TCP on port 9100 (most receipt/kitchen printers do).  
  - Optional: increase timeout in `.env`: `CHECK_PRINTER_TIMEOUT_MS=15000` (15 seconds).

- **Nothing prints**  
  - Confirm the printer’s IP (e.g. from its display or admin page).  
  - Ping from the PC: `ping 192.168.100.101`.  
  - Ensure `.env` has `CHECK_PRINTER_IP=192.168.100.101` (or add the printer via **POST /printers** with `isKitchen: false`).  
  - Check backend logs for printer timeout/errors (they are logged but do not fail the request).

- **Wrong printer or multiple copies**  
  - If you use Printers CRUD, every printer with `isKitchen: false` gets the receipt. Remove or edit printers you don’t want.  
  - If you use only `.env`, only `CHECK_PRINTER_IP` is used when no check printers exist in the DB.

- **Port different from 9100**  
  - Set `CHECK_PRINTER_PORT=9100` in `.env` or change to your printer’s port (e.g. 9101).  
  - Printers added via **POST /printers** use the same port from `CHECK_PRINTER_PORT` when sending.
