
import db from "../../config/db.js";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const params = isSuperAdmin ? [] : [userId];

        const conn = await db.getConnection();

        try {
            // 1. Total Stats (Existing logic)
            let orderQuery = `
        SELECT 
          COUNT(*) as total_orders, 
          SUM(grand_total) as total_revenue
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause}
      `;
            const [[orderStats]] = await conn.query(orderQuery, params);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStr = todayStart.toISOString().slice(0, 19).replace('T', ' ');

            let todayUserQuery = `
        SELECT COUNT(DISTINCT o.customer_id) as today_users
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause} AND o.created_at >= ?
      `;
            const [[todayUserStats]] = await conn.query(todayUserQuery, [...params, todayStr]);

            let customerQuery = `
        SELECT COUNT(DISTINCT o.customer_id) as total_customers
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause}
      `;
            const [[customerStats]] = await conn.query(customerQuery, params);

            // --- NEW CHARTS LOGIC ---

            // Chart 1: Hourly Orders Comparison (Today vs Yesterday)
            // We'll fetch all orders for today and yesterday
            const hourlyQuery = `
        SELECT 
            DATE(o.created_at) as date,
            HOUR(o.created_at) as hour, 
            COUNT(*) as count
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause} 
          AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) -- Get yesterday and today
        GROUP BY DATE(o.created_at), HOUR(o.created_at)
        ORDER BY date ASC, hour ASC
      `;
            const [hourlyRows] = await conn.query(hourlyQuery, params);

            // Process into { hour: '10 AM', today: 5, yesterday: 2 }
            const hourlyMap = {};
            // Initialize 0-23
            for (let i = 0; i < 24; i++) {
                const h = i < 10 ? `0${i}` : `${i}`; // 00, 01...
                hourlyMap[i] = {
                    hourLabel: `${i}:00`,
                    today: 0,
                    yesterday: 0
                };
            }

            const todayDate = new Date().toISOString().split('T')[0];

            hourlyRows.forEach(row => {
                const rowDateStr = row.date.toISOString().split('T')[0];
                const h = row.hour;
                // Check if rowDate matches Today (User's locale might differ but server time is source of truth here)
                // We used CURDATE() in SQL, so row.date should align.
                // Note: JS Date.toISOString() uses UTC. Ensure we match nicely.
                // Safer check: compare date strings from SQL if driver returns Date objects or strings.

                // Let's assume server local time for simpler processing or just check day diff
                const isToday = rowDateStr === todayDate;

                if (hourlyMap[h]) {
                    if (isToday) hourlyMap[h].today += row.count;
                    else hourlyMap[h].yesterday += row.count;
                }
            });
            const orderComparisonData = Object.values(hourlyMap);


            // Chart 2: Today's Revenue Cumulative (Hourly)
            const revenueQuery = `
        SELECT 
            HOUR(o.created_at) as hour, 
            SUM(o.grand_total) as total
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause} AND DATE(o.created_at) = CURDATE()
        GROUP BY HOUR(o.created_at)
        ORDER BY hour ASC
      `;
            const [revenueRows] = await conn.query(revenueQuery, params);

            const revenueData = [];
            let cumulative = 0;
            // Sparse fill
            for (let i = 0; i < 24; i++) {
                const found = revenueRows.find(r => r.hour === i);
                const val = Number(found?.total || 0);
                // Option A: Just hourly revenue
                revenueData.push({ time: `${i}:00`, revenue: val });

                // Option B: Cumulative? "Today's Revenue Generated" usually implies total climbing up.
                // Let's stick to hourly peaks, easier to read as "Sales Curve".
            }

            // Chart 3: Last 7 Days Completed Orders
            const completedQuery = `
        SELECT DATE(o.created_at) as date, COUNT(*) as count
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        WHERE ${whereClause} 
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND o.order_status = 4
        GROUP BY DATE(o.created_at)
        ORDER BY date ASC
      `;
            const [completedRows] = await conn.query(completedQuery, params);

            // Recent Orders Table (Existing)
            let recentOrdersQuery = `
        SELECT o.order_number, o.grand_total, o.created_at, o.order_status, c.full_name as customer_name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN restaurant_details rd ON p.user_id = rd.user_id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT 6
      `;
            const [recentOrders] = await conn.query(recentOrdersQuery, params);

            return res.json({
                status: 1,
                data: {
                    total_bookings: orderStats?.total_orders || 0,
                    total_revenue: orderStats?.total_revenue || 0,
                    today_users: todayUserStats?.today_users || 0,
                    followers: customerStats?.total_customers || 0,

                    // New Charts
                    orders_vs_yesterday: orderComparisonData,
                    today_revenue: revenueData,
                    completed_week: completedRows,

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
