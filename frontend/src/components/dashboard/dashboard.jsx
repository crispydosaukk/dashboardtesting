import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  ShoppingBag, Users, Store, UserPlus, ArrowUp, ArrowRight, CheckCircle, Clock
} from "lucide-react";
import Header from "../common/header.jsx";
import Sidebar from "../common/sidebar.jsx";
import Footer from "../common/footer.jsx";
import api from "../../api.js";

const StatCard = ({ title, value, subtext, colorClass, icon: Icon, delay }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.02] ${colorClass}`}
    style={{ animation: `fadeInUp 0.5s ease-out ${delay}s backwards` }}
  >
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon size={20} className="text-white" />
          </div>
        </div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
      <span className="text-xs font-medium text-white/90 flex items-center gap-1">
        <ArrowUp size={12} strokeWidth={3} /> {subtext}
      </span>
      <span className="text-xs text-white/60">Updated just now</span>
    </div>

    {/* Decorative Circle */}
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
  </div>
);

const ChartCard = ({ title, subtitle, children, darkMode = false }) => (
  <div className={`rounded-2xl p-6 shadow-sm border transition-shadow duration-300 relative overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 hover:shadow-md'}`}>
    <div className="mb-6 relative z-10">
      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{subtitle}</p>
    </div>
    <div className="h-64 w-full relative z-10">
      {children}
    </div>
    <div className={`mt-4 flex items-center gap-2 text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
      <Clock size={12} />
      <span>campaign sent 2 days ago</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: 0,
    today_users: 0,
    followers: 0,
    bar_chart: [],
    line_chart: [],
    recent_orders: [],
    // data for overview if needed, reusing recent_orders for now
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard-stats");
      if (res.data.status === 1) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Stats fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statuses = {
      0: { label: "Placed", color: "bg-blue-100 text-blue-700" },
      1: { label: "Accepted", color: "bg-indigo-100 text-indigo-700" },
      2: { label: "Rejected", color: "bg-red-100 text-red-700" },
      3: { label: "Ready", color: "bg-orange-100 text-orange-700" },
      4: { label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
      5: { label: "Cancelled", color: "bg-gray-100 text-gray-700" }
    };
    const s = statuses[status] || statuses[0];
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>;
  };

  // Prepare chart data if empty, ensuring safe access
  const barData = stats.bar_chart && stats.bar_chart.length > 0 ? stats.bar_chart : [
    { name: "M", count: 0 }, { name: "T", count: 0 }, { name: "W", count: 0 }, { name: "T", count: 0 }, { name: "F", count: 0 }, { name: "S", count: 0 }, { name: "S", count: 0 }
  ];

  const lineData = stats.line_chart && stats.line_chart.length > 0 ? stats.line_chart : [
    { month: "Jan", sales: 0 }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72 transition-all duration-300">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Overview of your notifications and analytics</p>
            </div>
            <div className="hidden sm:block text-slate-400 text-sm">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Orders"
              value={stats.total_bookings}
              subtext="+55% than last week"
              colorClass="bg-slate-800"
              icon={ShoppingBag}
              delay={0}
            />
            <StatCard
              title="Today's Users"
              value={stats.today_users}
              subtext="+3% than last month"
              colorClass="bg-blue-500"
              icon={Users}
              delay={0.1}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.total_revenue)}
              subtext="+1% than yesterday"
              colorClass="bg-emerald-500"
              icon={Store}
              delay={0.2}
            />
            <StatCard
              title="Total Customers"
              value={stats.followers}
              subtext="Just updated"
              colorClass="bg-rose-500"
              icon={UserPlus}
              delay={0.3}
            />
          </div>


          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* 1. Orders Comparison (Today vs Yesterday) */}
            <ChartCard title="Orders Overview" subtitle="Today vs Yesterday Performance">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.orders_vs_yesterday || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hourLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={3} // Show every 3rd hour to avoid crowding
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  {/* Yesterday - Grey/Light Blue */}
                  <Bar name="Yesterday" dataKey="yesterday" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={6} />
                  {/* Today - Primary Blue */}
                  <Bar name="Today" dataKey="today" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Today's Revenue Trend */}
            <ChartCard title="Daily Sales" subtitle={`Today's Revenue: ${formatCurrency(stats.today_revenue ? stats.today_revenue.reduce((a, b) => a + Number(b.revenue), 0) : 0)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.today_revenue && stats.today_revenue.length > 0 ? stats.today_revenue : []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={3}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Completed Orders Last 7 Days (Dark) */}
            <ChartCard title="Completed Tasks" subtitle="Weekly Delivery Performance" darkMode={true}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.completed_week && stats.completed_week.length > 0 ? stats.completed_week : []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(str) => new Date(str).getDate()} // Just show day number
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#fff"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#334155' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* RECENT ORDERS TABLE (2/3 width) */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Recent Orders</h3>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                    <CheckCircle size={12} />
                    <span>30 done this month</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
                  <span className="sr-only">Menu</span>
                  ⋮
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Order No</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!stats.recent_orders || stats.recent_orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-sm">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      stats.recent_orders.slice(0, 5).map((order, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-700">#{order.order_number}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                            {order.customer_name || "Guest"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">{formatCurrency(order.grand_total)}</td>
                          <td className="px-6 py-4">{getStatusBadge(order.order_status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ORDERS OVERVIEW (1/3 width) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800">Orders overview</h3>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                  <ArrowUp size={12} strokeWidth={3} />
                  <span>24% this month</span>
                </div>
              </div>

              <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {stats.recent_orders && stats.recent_orders.slice(0, 5).map((order, i) => (
                  <div key={i} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${order.order_status == 1 ? 'bg-indigo-500' :
                      order.order_status == 4 ? 'bg-emerald-500' :
                        order.order_status == 2 ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Order #{order.order_number}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </main>
        <Footer />
      </div>
    </div>
  );
}
