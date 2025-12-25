import db from "./src/config/db.js";

async function debug() {
    try {
        console.log("--- ORDERS (Limit 10) ---");
        const [orders] = await db.query("SELECT id, order_number, user_id, product_id, customer_id FROM orders ORDER BY id DESC LIMIT 10");
        console.table(orders);

        const productIds = [...new Set(orders.map(o => o.product_id))];
        console.log("\n--- PRODUCTS (For above orders) ---");
        if (productIds.length) {
            // Removed 'name' as it caused error, using 'product_name' or just valid columns
            const [products] = await db.query(`SELECT id, user_id, product_name FROM products WHERE id IN (${productIds.join(',')})`);
            console.table(products);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debug();
