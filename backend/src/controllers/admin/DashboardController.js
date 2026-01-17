
import db from "../../config/db.js";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const baseParams = isSuperAdmin ? [] : [userId];

        // Filter by Restaurant (Super Admin only)
        const { startDate, endDate, restaurantId } = req.query;
        let targetUserId = userId;
        let effectiveWhere = whereClause;
        let effectiveParams = [...baseParams];

        if (isSuperAdmin && restaurantId && restaurantId !== "all") {
            effectiveWhere = "rd.user_id = ?";
            effectiveParams = [restaurantId];
            targetUserId = restaurantId;
        }

        // Parse Date or Range
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const targetStartDateStr = startDate || todayStr;
        const targetEndDateStr = endDate || startDate || todayStr;

        // Is Single Day?
        const isSingleDay = targetStartDateStr === targetEndDateStr;

        // Determine Previous Range
        let prevStartDateStr, prevEndDateStr;
        if (isSingleDay) {
            // Previous day
            const d = new Date(targetStartDateStr);
            d.setDate(d.getDate() - 1);
            prevStartDateStr = d.toISOString().split('T')[0];
            prevEndDateStr = prevStartDateStr;
        } else {
            // Shift whole range back by duration
            const start = new Date(targetStartDateStr);
            const end = new Date(targetEndDateStr);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

            const pStart = new Date(start);
            pStart.setDate(pStart.getDate() - diffDays);
            const pEnd = new Date(end);
            pEnd.setDate(pEnd.getDate() - diffDays);

            prevStartDateStr = pStart.toISOString().split('T')[0];
            prevEndDateStr = pEnd.toISOString().split('T')[0];
        }


        const conn = await db.getConnection();

        try {
            // Fetch Restaurant Name
            let restaurantName = "Dashboard";
            if (isSuperAdmin && (!restaurantId || restaurantId === "all")) {
                restaurantName = "Super Admin";
            } else {
                const lookupId = (isSuperAdmin && restaurantId) ? restaurantId : userId;
                const rQuery = `SELECT restaurant_name FROM restaurant_details WHERE user_id = ?`;
                const [[rDetails]] = await conn.query(rQuery, [lookupId]);
                if (rDetails) restaurantName = rDetails.restaurant_name;
            }

            // 1. LIFETIME STATS
            const totalOrderQuery = `
                SELECT 
                    COUNT(*) as total_orders, 
                    SUM(grand_total) as total_revenue
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${effectiveWhere}
            `;
            const [[totalStats]] = await conn.query(totalOrderQuery, effectiveParams);

            const customerQuery = `
                SELECT COUNT(DISTINCT o.customer_id) as total_customers
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${effectiveWhere}
            `;
            const [[customerStats]] = await conn.query(customerQuery, effectiveParams);


            // 2. SELECTED RANGE STATS
            const rangeStatsQuery = `
                SELECT 
                    COUNT(DISTINCT o.order_number) as count, 
                    SUM(o.grand_total) as revenue 
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${effectiveWhere} 
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[rangeStats]] = await conn.query(rangeStatsQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr]);


            // 3. CHARTS

            // A. SALES COMPARISON (Revenue)
            // If Single Day: Compare Hourly Revenue (Today vs Yesterday)
            // If Range: Compare Daily Revenue (This Range vs Prev Range)
            let salesComparisonData = [];

            if (isSingleDay) {
                // Hourly Comparison
                const hourlyQuery = `
                    SELECT 
                        DATE(o.created_at) as date,
                        HOUR(o.created_at) as unit, 
                        SUM(o.grand_total) as total
                    FROM (
                         SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                         FROM orders o
                         JOIN products p ON o.product_id = p.id
                         JOIN restaurant_details rd ON p.user_id = rd.user_id
                         WHERE ${effectiveWhere} AND DATE(o.created_at) IN (?, ?)
                         GROUP BY o.order_number
                    ) as o
                    GROUP BY DATE(o.created_at), HOUR(o.created_at)
                `;
                const [rows] = await conn.query(hourlyQuery, [...effectiveParams, prevStartDateStr, targetStartDateStr]);

                const map = {};
                for (let i = 0; i < 24; i++) map[i] = { label: `${i}:00`, current: 0, previous: 0 };

                rows.forEach(row => {
                    const rowDateStr = row.date.toISOString().split('T')[0];
                    if (map[row.unit]) {
                        if (rowDateStr === targetStartDateStr) map[row.unit].current += Number(row.total);
                        else map[row.unit].previous += Number(row.total);
                    }
                });
                salesComparisonData = Object.values(map);

            } else {
                // Daily Comparison
                // We need to match Day 1 of current range with Day 1 of prev range
                // We'll calculate "Day Offset" from start
                const dailyQuery = `
                    SELECT 
                        DATE(o.created_at) as date,
                        SUM(o.grand_total) as total
                    FROM (
                         SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                         FROM orders o
                         JOIN products p ON o.product_id = p.id
                         JOIN restaurant_details rd ON p.user_id = rd.user_id
                         WHERE ${effectiveWhere} AND (
                             (DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?) OR
                             (DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?)
                         )
                         GROUP BY o.order_number
                    ) as o
                    GROUP BY DATE(o.created_at)
                `;
                const [rows] = await conn.query(dailyQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, prevStartDateStr, prevEndDateStr]);

                // Map results
                // Strategy: Create array of days for target range. Match previous by index.
                const days = [];
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    days.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                }

                salesComparisonData = days.map((dayStr, idx) => {
                    // Find current val
                    const currentVal = rows.find(r => r.date.toISOString().split('T')[0] === dayStr)?.total || 0;

                    // Find prev val (dayStr - diff ?)
                    // Or simpler: We know the previous range has same duration.
                    // We need to find the date at 'idx' offset in previous range.
                    const pStart = new Date(prevStartDateStr);
                    pStart.setDate(pStart.getDate() + idx);
                    const pDayStr = pStart.toISOString().split('T')[0];
                    const prevVal = rows.find(r => r.date.toISOString().split('T')[0] === pDayStr)?.total || 0;

                    return { label: dayStr, current: Number(currentVal), previous: Number(prevVal) };
                });
            }


            // B. AVERAGE COST (Avg Order Value) Trend
            // Query: Sum(Total) / Count(Orders)
            let avgOrderValueData = [];

            if (isSingleDay) {
                const hourlyAvgQuery = `
                    SELECT 
                        HOUR(created_at) as unit,
                        SUM(grand_total) as total_rev,
                        COUNT(order_number) as total_orders
                    FROM (
                        SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                        FROM orders o
                        JOIN products p ON o.product_id = p.id
                        JOIN restaurant_details rd ON p.user_id = rd.user_id
                        WHERE ${effectiveWhere} AND DATE(o.created_at) = ?
                        GROUP BY o.order_number
                    ) as unique_orders
                    GROUP BY HOUR(created_at)
                    ORDER BY unit ASC
                `;
                const [rows] = await conn.query(hourlyAvgQuery, [...effectiveParams, targetStartDateStr]);

                for (let i = 0; i < 24; i++) {
                    const row = rows.find(r => r.unit === i);
                    const avg = row ? (Number(row.total_rev) / Number(row.total_orders)) : 0;
                    avgOrderValueData.push({ label: `${i}:00`, value: avg });
                }

            } else {
                const dailyAvgQuery = `
                    SELECT 
                        DATE(created_at) as date,
                        SUM(grand_total) as total_rev,
                        COUNT(order_number) as total_orders
                    FROM (
                        SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                        FROM orders o
                        JOIN products p ON o.product_id = p.id
                        JOIN restaurant_details rd ON p.user_id = rd.user_id
                        WHERE ${effectiveWhere} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                        GROUP BY o.order_number
                    ) as unique_orders
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                `;
                const [rows] = await conn.query(dailyAvgQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr]);

                // Fill gaps
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    const row = rows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    const avg = row ? (Number(row.total_rev) / Number(row.total_orders)) : 0;
                    avgOrderValueData.push({ label: dStr, value: avg });
                    curr.setDate(curr.getDate() + 1);
                }
            }


            // C. WEEKLY ORDERS (Monday - Sunday)
            // Always show current week (or if range is within a week, shows that week).
            // Let's stick to "Selected Range Orders Trend" to be safe and accurate to the filter.
            // If the user selects "This Week", it automatically covers Mon-Sun.
            const ordersTrendQuery = `
                SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.order_number) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                WHERE ${effectiveWhere} 
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;
            const [ordersTrendRows] = await conn.query(ordersTrendQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr]);

            // Normalize dates to ensure continuity for graphs
            let ordersTrendData = [];
            if (!isSingleDay) {
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    const found = ordersTrendRows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    ordersTrendData.push({ date: dStr, count: found ? found.count : 0 });
                    curr.setDate(curr.getDate() + 1);
                }
            } else {
                // If single day, show hourly distribution instead? 
                // The prompt asks for "Weekly Orders". If selected range is "Today", showing "Weekly" might be confusing unless we explicitly fetch the surrounding week.
                // Let's implement logical "Weekly Context": Start of Week (Mon) to End of Week (Sun) containing the Target Date.

                const tDate = new Date(targetStartDateStr);
                const day = tDate.getDay() || 7; // 1=Mon, 7=Sun
                const weekStart = new Date(tDate);
                weekStart.setHours(-24 * (day - 1));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const sStr = weekStart.toISOString().split('T')[0];
                const eStr = weekEnd.toISOString().split('T')[0];

                const weeklyQuery = `
                    SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.order_number) as count
                    FROM orders o
                    JOIN products p ON o.product_id = p.id
                    JOIN restaurant_details rd ON p.user_id = rd.user_id
                    WHERE ${effectiveWhere} 
                      AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                    GROUP BY DATE(o.created_at)
                    ORDER BY date ASC
                `;
                const [wRows] = await conn.query(weeklyQuery, [...effectiveParams, sStr, eStr]);

                let currW = new Date(sStr);
                const endW = new Date(eStr);
                while (currW <= endW) {
                    const dStr = currW.toISOString().split('T')[0];
                    const found = wRows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    ordersTrendData.push({ date: dStr, count: found ? found.count : 0 });
                    currW.setDate(currW.getDate() + 1);
                }
            }


            // D. Top Selling Products (Filtered by Range)
            const topProductsQuery = `
                SELECT 
                    p.product_name as name, 
                    p.product_image as image,
                    p.product_price as price,
                    p.product_desc as description,
                    c.category_name as category_name,
                    COUNT(*) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                JOIN restaurant_details rd ON p.user_id = rd.user_id
                LEFT JOIN categories c ON p.cat_id = c.id
                WHERE ${effectiveWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                GROUP BY p.id, p.product_name, p.product_image, p.product_price, p.product_desc, c.category_name
                ORDER BY count DESC
                LIMIT 10
            `;
            const [topProductsRows] = await conn.query(topProductsQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr]);


            // 4. RECENT ORDERS
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
                WHERE ${effectiveWhere} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                GROUP BY o.order_number
                ORDER BY MAX(o.created_at) DESC
            `;
            const [recentOrders] = await conn.query(recentOrdersQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr]);

            // 5. SUPER ADMIN EXTRAS
            let pendingOrdersVal = 0;
            let restaurantPerformance = [];

            if (isSuperAdmin) {
                // Filter by range or all time? User asked "when custom range selected...".
                const pendingQuery = `
                    SELECT COUNT(DISTINCT o.order_number) as count
                    FROM orders o
                    WHERE o.order_status IN (0, 1) AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                 `;
                const [[pendingRes]] = await conn.query(pendingQuery, [targetStartDateStr, targetEndDateStr]);
                pendingOrdersVal = pendingRes?.count || 0;

                // Restaurant Wise Data (in range)
                const perfQuery = `
                    SELECT 
                        rd.restaurant_name,
                        COUNT(DISTINCT o.order_number) as order_count,
                        SUM(o.grand_total) as revenue
                    FROM orders o
                    JOIN products p ON o.product_id = p.id
                    JOIN restaurant_details rd ON p.user_id = rd.user_id
                    WHERE DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                    GROUP BY rd.restaurant_name
                    ORDER BY revenue DESC
                 `;
                const [perfRows] = await conn.query(perfQuery, [targetStartDateStr, targetEndDateStr]);
                restaurantPerformance = perfRows;
            }

            return res.json({
                status: 1,
                data: {
                    total_bookings: totalStats?.total_orders || 0, // Lifetime
                    total_revenue: totalStats?.total_revenue || 0, // Lifetime
                    restaurant_name: restaurantName,

                    // Range Stats
                    today_users: rangeStats?.count || 0,
                    daily_revenue: rangeStats?.revenue || 0,

                    followers: customerStats?.total_customers || 0,

                    // New Charts
                    sales_comparison: salesComparisonData,  // Replaces orders_vs_yesterday
                    avg_order_cost: avgOrderValueData,      // Replaces today_revenue (trend)
                    weekly_orders: ordersTrendData,         // Replaces completed_week

                    top_selling_products: topProductsRows,

                    recent_orders: recentOrders,

                    // Extras
                    pending_orders: pendingOrdersVal,
                    restaurant_performance: restaurantPerformance,
                    is_super_admin: isSuperAdmin
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
                o.special_instruction,
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

export const getRestaurantsList = async (req, res) => {
    try {
        const query = `SELECT user_id, restaurant_name FROM restaurant_details ORDER BY restaurant_name ASC`;
        const conn = await db.getConnection();
        const [rows] = await conn.query(query);
        conn.release();
        return res.json({ status: 1, data: rows });
    } catch (error) {
        console.error("Get restaurants error:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};
