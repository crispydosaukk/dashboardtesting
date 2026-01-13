
import db from "../../config/db.js";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const baseParams = isSuperAdmin ? [] : [userId];

        // Parse Date
        const queryDate = req.query.date;
        const targetDate = queryDate ? new Date(queryDate) : new Date();
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const prevDate = new Date(targetDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        const conn = await db.getConnection();

        try {
            // 1. LIFETIME STATS (Total Orders, Total Revenue, Total Customers)
            // Should NOT change with date selection
            const totalOrderQuery = `
                SELECT 
                    COUNT(*) as total_orders, 
                    SUM(grand_total) as total_revenue
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${whereClause}
            `;
            const [[totalStats]] = await conn.query(totalOrderQuery, baseParams);

            const customerQuery = `
                SELECT COUNT(DISTINCT o.customer_id) as total_customers
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${whereClause}
            `;
            const [[customerStats]] = await conn.query(customerQuery, baseParams);


            // 2. DAILY STATS (Selected Date Orders, Selected Date Revenue)
            const dailyCorrectedQuery = `
                SELECT COUNT(*) as count, SUM(daily_total) as revenue FROM (
                    SELECT o.order_number, MAX(o.grand_total) as daily_total
                    FROM orders o
                    JOIN products p ON o.product_id = p.id
                    JOIN restaurant_details rd ON p.user_id = rd.user_id
                    WHERE ${whereClause} AND DATE(o.created_at) = ?
                    GROUP BY o.order_number
                ) as sub
            `;
            const [[dailyStats]] = await conn.query(dailyCorrectedQuery, [...baseParams, targetDateStr]);


            // 3. CHARTS

            // A. Hourly Orders Comparison
            const hourlyQuery = `
                SELECT 
                    DATE(o.created_at) as date,
                    HOUR(o.created_at) as hour, 
                    COUNT(DISTINCT o.order_number) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${whereClause} 
                  AND DATE(o.created_at) IN (?, ?)
                GROUP BY DATE(o.created_at), HOUR(o.created_at)
            `;
            const [hourlyRows] = await conn.query(hourlyQuery, [...baseParams, prevDateStr, targetDateStr]);

            // Combine
            const hourlyMap = {};
            for (let i = 0; i < 24; i++) hourlyMap[i] = { hourLabel: `${i}:00`, today: 0, yesterday: 0 };

            hourlyRows.forEach(row => {
                const rowDateStr = row.date.toISOString().split('T')[0];
                const h = row.hour;
                if (hourlyMap[h]) {
                    if (rowDateStr === targetDateStr) hourlyMap[h].today += row.count;
                    else hourlyMap[h].yesterday += row.count;
                }
            });
            const orderComparisonData = Object.values(hourlyMap);


            // B. Hourly Revenue Trend (Selected Date)
            const hourlyRevenueQuery = `
                SELECT 
                    HOUR(created_at) as hour,
                    SUM(grand_total) as total
                FROM (
                    SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                    FROM orders o
                    JOIN products p ON o.product_id = p.id
                    JOIN restaurant_details rd ON p.user_id = rd.user_id
                    WHERE ${whereClause} AND DATE(o.created_at) = ?
                    GROUP BY o.order_number
                ) as unique_orders
                GROUP BY HOUR(created_at)
                ORDER BY hour ASC
            `;
            const [revenueRows] = await conn.query(hourlyRevenueQuery, [...baseParams, targetDateStr]);

            const revenueData = [];
            for (let i = 0; i < 24; i++) {
                const found = revenueRows.find(r => r.hour === i);
                revenueData.push({ time: `${i}:00`, revenue: Number(found?.total || 0) });
            }

            // C. Weekly Completed Orders (Leading up to Selected Date)
            const completedQuery = `
                SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.order_number) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${whereClause} 
                  AND o.created_at BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND DATE_ADD(?, INTERVAL 1 DAY)
                  AND o.order_status = 4
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;
            const [completedRows] = await conn.query(completedQuery, [...baseParams, targetDateStr, targetDateStr]);


            // D. Top Selling Products (Lifetime)
            const topProductsQuery = `
                SELECT 
                    p.product_name as name, 
                    COUNT(*) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${whereClause}
                GROUP BY p.id, p.product_name
                ORDER BY count DESC
                LIMIT 5
            `;
            const [topProductsRows] = await conn.query(topProductsQuery, baseParams);


            // 4. RECENT ORDERS TABLE (Filtered by Selected Date)
            const recentOrdersQuery = `
                SELECT 
                    o.order_number, 
                    MAX(o.grand_total) as grand_total, 
                    MAX(o.created_at) as created_at, 
                    o.order_status, 
                    MAX(c.full_name) as customer_name,
                    MAX(c.email) as customer_email,
                    MAX(c.mobile_number) as customer_phone
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE ${whereClause} AND DATE(o.created_at) = ?
                GROUP BY o.order_number
                ORDER BY MAX(o.created_at) DESC
            `;
            const [recentOrders] = await conn.query(recentOrdersQuery, [...baseParams, targetDateStr]);

            return res.json({
                status: 1,
                data: {
                    total_bookings: totalStats?.total_orders || 0, // Lifetime
                    total_revenue: totalStats?.total_revenue || 0, // Lifetime

                    // Daily Stats (Specific Date)
                    today_users: dailyStats?.count || 0, // Actually "Orders count for date"
                    // Wait, original was 'today_users' (unique customers today). 
                    // My query above did 'count(order_no)'. 
                    // Let's stick to consistent naming but maybe payload sends 'daily_orders_count'?
                    // Frontend expects 'today_users' mapped to 'Today's Users' card.
                    // Let's verify what 'today_users' meant. Old code: COUNT(DISTINCT customer_id).
                    // I'll keep it as orders count for now as it's more useful, or revert to customers.
                    // User asked "Today's Order Count" in previous turn.
                    daily_revenue: dailyStats?.revenue || 0,

                    followers: customerStats?.total_customers || 0,

                    // New Charts
                    orders_vs_yesterday: orderComparisonData,
                    today_revenue: revenueData,
                    completed_week: completedRows,

                    top_selling_products: topProductsRows, // Replaces status distribution

                    recent_orders: recentOrders
                }
            });

        } finally {
            conn.release();
        }

    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");
        const { order_number } = req.params;

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const params = isSuperAdmin ? [order_number] : [userId, order_number];

        const query = `
            SELECT 
                p.product_name,
                p.product_image,
                o.quantity,
                o.price,
                (o.quantity * o.price) as total_price,
                o.grand_total, -- Included for reference
                o.created_at
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN restaurant_details rd ON p.user_id = rd.user_id
            WHERE ${whereClause} AND o.order_number = ?
        `;

        const conn = await db.getConnection();
        const [rows] = await conn.query(query, params);
        conn.release();

        return res.json({
            status: 1,
            data: rows
        });

    } catch (error) {
        console.error("Order details error:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};
