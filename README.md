# Chill Thrill Restaurant - Full-Stack PHP Update

This project has been updated from a frontend-only (localStorage) application to a complete full-stack system using Core PHP and MySQL.

## How to Run This Application

Follow these steps exactly to run the new backend features locally:

### 1. Start XAMPP (Apache + MySQL)
- Open your **XAMPP Control Panel**.
- Click **Start** next to **Apache** (for PHP).
- Click **Start** next to **MySQL** (for the Database).

### 2. Create Database in phpMyAdmin
- Open your browser and go to: `http://localhost/phpmyadmin/`
- Click on **New** on the left sidebar to create a new database.
- Enter `restaurant` as the database name and click **Create**.

### 3. Import SQL
- Select the `restaurant` database from the left sidebar.
- Click the **Import** tab at the top.
- Under **File to import**, click **Choose File** and select the `database.sql` file located in `d:\CT new\CT\`.
- Scroll to the bottom and click **Go**.
- *This will create the `orders` table.*

### 4. Place project in htdocs
- Ensure your project files (`d:\CT new\CT\`) are placed inside the XAMPP `htdocs` directory.
- *Example:* `C:\xampp\htdocs\restaurant\` or `C:\xampp\htdocs\CT\`
- Move or copy the entire `CT` folder into the `htdocs` folder if it is not already there.

### 5. Open in Browser
- If you placed it in `htdocs/CT`, go to: `http://localhost/CT/index.html`
- Once opened, try adding an item to the cart, verifying the checkout form, and submitting the order.
- Navigate to `http://localhost/CT/admin.html` to see the live orders fetched securely from the MySQL database!

## Changes Made
- Introduced a `api/` directory with `config.php`, `place_order.php`, `get_orders.php`, `update_order.php`, and `delete_order.php`.
- Modified `script.js` to post new order data to `place_order.php` asynchronously.
- Modified `admin.js` to load the stats, charts, and table lists synchronously from the backend via `get_orders.php`.
