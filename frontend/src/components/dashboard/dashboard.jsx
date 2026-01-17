import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import {
  ShoppingBag, Users, Store, UserPlus, ArrowUp, ArrowRight, CheckCircle, Clock, Eye, X, Calendar, DollarSign, TrendingUp, CreditCard, ChevronDown, PoundSterling
} from "lucide-react";
import Header from "../common/header.jsx";
import Sidebar from "../common/sidebar.jsx";
import Footer from "../common/footer.jsx";
import api from "../../api.js";
import { motion, AnimatePresence } from "framer-motion";

// --- Components ---

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl p-6 border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl group hover:bg-white/15 transition-all duration-300"
  >
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className={`p-3 rounded-xl backdrop-blur-md mb-3 inline-block ${colorClass}`}>
          <Icon size={22} className="text-white" />
        </div>
        <p className="text-sm font-medium text-white/70">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1 drop-shadow-md">{value}</h3>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
      <span className="text-xs font-medium text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
        <ArrowUp size={12} strokeWidth={3} /> {subtext}
      </span>
    </div>
    {/* Decorative Glow */}
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
  </motion.div>
);

const ChartCard = ({ title, subtitle, children, delay, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    className={`rounded-2xl p-6 shadow-xl border border-white/20 bg-white/10 backdrop-blur-xl flex flex-col ${className}`}
  >
    <div className="mb-6">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-xs mt-1 text-white/60">{subtitle}</p>
    </div>
    <div className="flex-1 w-full min-h-[250px] relative">
      {children}
    </div>
  </motion.div>
);

const OrderDetailsModal = ({ order, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (order?.order_number) {
      api.get(`/dashboard/order-details/${encodeURIComponent(order.order_number)}`)
        .then(res => {
          if (res.data.status === 1) setItems(res.data.data);
        })
        .catch(err => console.error("Failed to load items", err))
        .finally(() => setLoading(false));
    }
  }, [order]);

  if (!order) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={20} /> Order #{order.order_number}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-emerald-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                <Users size={14} /> Customer Details
              </h4>
              <div className="space-y-2">
                <p className="text-white font-medium text-lg">{order.customer_name || "Guest"}</p>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Clock size={14} />
                  <span>{order.customer_email || "No Email"}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Clock size={14} />
                  <span>{order.customer_phone || "No Phone"}</span>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-emerald-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Payment & Status
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Amount</span>
                  <span className="text-white font-bold text-lg">{order.grand_total ? `£${Number(order.grand_total).toFixed(2)}` : '£0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${Number(order.order_status) === 4 ? "bg-emerald-500/20 text-emerald-400" :
                    Number(order.order_status) === 0 ? "bg-blue-500/20 text-blue-400" :
                      Number(order.order_status) === 2 ? "bg-red-500/20 text-red-400" :
                        "bg-amber-500/20 text-amber-400"
                    }`}>
                    {Number(order.order_status) === 0 ? 'Placed' :
                      Number(order.order_status) === 1 ? 'Accepted' :
                        Number(order.order_status) === 2 ? 'Rejected' :
                          Number(order.order_status) === 3 ? 'Ready' :
                            Number(order.order_status) === 4 ? 'Collected' : 'Cancelled'}
                  </span>
                </div>
                <div className="text-xs text-white/40 mt-2">
                  Placed on {new Date(order.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div>
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <ShoppingBag size={16} className="text-emerald-400" /> Order Items
            </h4>
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-white/40">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-white/40">No items found</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/50 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium text-center">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-white flex items-center gap-3">
                          {/* Optional Image */}
                          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs overflow-hidden">
                            {item.product_image ? (
                              <img
                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/uploads/${item.product_image}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag size={12} className="opacity-50" />
                            )}
                          </div>
                          <div>
                            <span className="block font-medium">{item.product_name}</span>
                            {item.special_instruction && (
                              <div className="mt-1 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 inline-flex items-center gap-1">
                                <span className="uppercase text-[10px] tracking-wider opacity-70">Note:</span>
                                {item.special_instruction}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70 text-center">x{item.quantity}</td>
                        <td className="px-4 py-3 text-emerald-300 font-medium text-right">£{Number(item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white/5 border-t border-white/10">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-right font-bold text-white">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">£{Number(order.grand_total).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-4 border-t border-white/10 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProductDetailsModal = ({ product, onClose }) => {
  if (!product) return null;

  const getImageUrl = (image) => {
    if (!image) return null;
    const cleanImage = image.replace(/^uploads\//, '');
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
    return `${baseUrl}/uploads/${cleanImage}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
      >
        <div className="relative h-56 w-full bg-white/5">
          {product.image ? (
            <img
              src={getImageUrl(product.image)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <ShoppingBag size={48} />
            </div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
            <h3 className="text-2xl font-bold text-white shadow-sm">{product.name}</h3>
            <p className="text-emerald-300 font-medium text-sm mt-1">{product.category_name || "Uncategorized"}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <span className="text-white/60 text-xs block mb-1">Price</span>
              <span className="text-2xl font-bold text-white">£{Number(product.price).toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-white/60 text-xs block mb-1">Total Sales</span>
              <span className="text-xl font-bold text-emerald-400">{product.count} <span className="text-sm font-normal text-white/60">units</span></span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 className="text-white/60 text-xs font-bold uppercase mb-2 flex items-center gap-2">
              <Clock size={12} /> Description
            </h4>
            <p className="text-white/80 text-sm leading-relaxed">
              {product.description || "No description available for this product."}
            </p>
          </div>
        </div>

        <div className="bg-white/5 p-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold shadow-lg shadow-emerald-500/20">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


// --- Main Dashboard ---

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_revenue: 0,
    today_users: 0,
    followers: 0,
    sales_comparison: [],
    avg_order_cost: [],
    weekly_orders: [],
    top_selling_products: [],
    recent_orders: [],
    restaurant_name: "",
    is_super_admin: false,
    pending_orders: 0,
    restaurant_performance: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Restaurant Filter State (Super Admin)
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(""); // "" means All
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    label: 'Today'
  });
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [isCustomMode, setIsCustomMode] = useState(false);

  const ordersPerPage = 10;

  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedRestaurant]); // Refetch when range or restaurant changes

  useEffect(() => {
    // Fetch restaurants once if we don't have them (and ideally if super admin, but we can just fetch)
    const fetchRestaurants = async () => {
      try {
        const res = await api.get('/dashboard/restaurants');
        if (res.data.status === 1) {
          setRestaurants(res.data.data);
        }
      } catch (err) {
        // Ignore error (likely not super admin)
      }
    };
    fetchRestaurants();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard-stats?startDate=${dateRange.start}&endDate=${dateRange.end}&restaurantId=${selectedRestaurant}`);
      if (res.data.status === 1) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Stats fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeSelect = (option) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (option === 'Today') {
      // already set
    } else if (option === 'This Week') {
      const day = today.getDay() || 7;
      if (day !== 1) start.setHours(-24 * (day - 1));
    } else if (option === 'This Month') {
      start.setDate(1);
    } else if (option === 'This Quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start.setMonth(q * 3);
      start.setDate(1);
    } else if (option === 'This Year') {
      start.setMonth(0);
      start.setDate(1);
    } else if (option === 'Previous Week') {
      start.setDate(today.getDate() - today.getDay() - 6);
      end.setDate(today.getDate() - today.getDay());
    } else if (option === 'Previous Month') {
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
    } else if (option === 'Previous Quarter') {
      const q = Math.floor(today.getMonth() / 3);
      start.setMonth((q - 1) * 3);
      start.setDate(1);
      end.setMonth(q * 3);
      end.setDate(0);
    } else if (option === 'Previous Year') {
      start.setFullYear(today.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end.setFullYear(today.getFullYear() - 1);
      end.setMonth(11);
      end.setDate(31);
    } else if (option === 'Custom Range') {
      setIsCustomMode(true);
      return; // Wait for inputs
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setDateRange({ start: sStr, end: eStr, label: option });
    setShowRangeMenu(false);
    setIsCustomMode(false);
  };

  const applyCustomRange = () => {
    if (customRange.start && customRange.end) {
      setDateRange({ start: customRange.start, end: customRange.end, label: 'Custom Range' });
      setShowRangeMenu(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(amount) || 0);
  };

  // derived stats
  // derived stats
  const todayRevenueTotal = stats.daily_revenue || 0;
  // stats.today_users is effectively "Orders Count" for the day per backend changes
  const todayOrdersCount = stats.today_users || 0;


  // Pagination Logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = stats.recent_orders?.slice(indexOfFirstOrder, indexOfLastOrder) || [];
  const totalPages = Math.ceil((stats.recent_orders?.length || 0) / ordersPerPage);

  const getStatusBadge = (status) => {
    const s = Number(status);
    if (s === 0) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Placed</span>;
    if (s === 1) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Accepted</span>;
    if (s === 2) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">Rejected</span>;
    if (s === 3) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Ready</span>;
    if (s === 4) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Collected</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-300">Cancelled</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 text-white font-sans selection:bg-emerald-500/30">
      <style dangerouslySetInnerHTML={{
        __html: `
            .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
            }
        `}} />
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} darkMode={true} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:pl-80 lg:pr-8">
        <div className="max-w-7xl mx-auto">

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-md">
                {stats.restaurant_name ? `Welcome to ${stats.restaurant_name}` : "Dashboard"}
              </h1>
              <p className="text-white/70 mt-1">Real-time overview of your restaurant's performance</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Restaurant Filter (Super Admin) */}
              {stats.is_super_admin && (
                <div className="relative">
                  <button
                    onClick={() => setShowRestaurantMenu(!showRestaurantMenu)}
                    className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-medium shadow-lg hover:bg-white/20 transition-all min-w-[240px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-white/70" />
                      <span className="truncate max-w-[180px]">
                        {selectedRestaurant
                          ? restaurants.find(r => r.user_id == selectedRestaurant)?.restaurant_name
                          : "All Restaurants"}
                      </span>
                    </div>
                    <ChevronDown size={14} className={`text-white/60 transition-transform ${showRestaurantMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showRestaurantMenu && (
                    <div className="absolute left-0 top-full mt-2 w-full bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-80 overflow-y-auto custom-scrollbar">
                      <button
                        onClick={() => { setSelectedRestaurant(""); setShowRestaurantMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${selectedRestaurant === "" ? 'text-emerald-400 font-bold bg-white/5' : 'text-white/80'}`}
                      >
                        All Restaurants
                      </button>
                      {restaurants.map(r => (
                        <button
                          key={r.user_id}
                          onClick={() => { setSelectedRestaurant(r.user_id); setShowRestaurantMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${selectedRestaurant == r.user_id ? 'text-emerald-400 font-bold bg-white/5' : 'text-white/80'}`}
                        >
                          {r.restaurant_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Range Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowRangeMenu(!showRangeMenu)}
                  className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white font-medium shadow-lg hover:bg-white/20 transition-all min-w-[240px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-white/70" />
                    <span>{dateRange.label} ({dateRange.start === dateRange.end ? dateRange.start : `${dateRange.start} - ${dateRange.end}`})</span>
                  </div>
                  <ChevronDown size={14} className={`text-white/60 transition-transform ${showRangeMenu ? 'rotate-180' : ''}`} />
                </button>

                {showRangeMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {!isCustomMode ? (
                      <div className="py-1">
                        {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Previous Week', 'Previous Month', 'Previous Quarter', 'Previous Year', 'Custom Range'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleRangeSelect(opt)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${dateRange.label === opt ? 'text-emerald-400 font-bold bg-white/5' : 'text-white/80'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2 text-white/50 cursor-pointer hover:text-white" onClick={() => setIsCustomMode(false)}>
                          <ArrowRight size={14} className="rotate-180" /> Back
                        </div>
                        <div>
                          <label className="text-xs text-white/50 block mb-1">Start Date</label>
                          <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 block mb-1">End Date</label>
                          <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
                        </div>
                        <button onClick={applyCustomRange} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold mt-2">Apply</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid - Moved Pending Orders inside here for "Side by Side" layout */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${stats.is_super_admin ? 'xl:grid-cols-5' : ''} gap-6 mb-8`}>
            {/* Orders Card */}
            <StatCard
              title={`Orders (${dateRange.label})`}
              value={todayOrdersCount}
              subtext={dateRange.label}
              icon={ShoppingBag}
              colorClass="bg-blue-500/20 border border-blue-400/30"
              delay={0}
            />
            <StatCard
              title={`Revenue (${dateRange.label})`}
              value={formatCurrency(todayRevenueTotal)}
              subtext={dateRange.label}
              icon={PoundSterling}
              colorClass="bg-emerald-500/20 border border-emerald-400/30"
              delay={0.1}
            />
            <StatCard
              title="Total Customers"
              value={stats.followers}
              subtext="Lifetime customers"
              icon={Users}
              colorClass="bg-amber-500/20 border border-amber-400/30"
              delay={0.2}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.total_revenue)}
              subtext="Lifetime revenue"
              icon={TrendingUp}
              colorClass="bg-purple-500/20 border border-purple-400/30"
            />

            {/* Pending Orders (Super Admin Only) - Added to grid */}
            {stats.is_super_admin && (
              <StatCard
                title="Pending Orders"
                value={stats.pending_orders}
                subtext="Action Required"
                icon={Clock}
                colorClass="bg-rose-500/20 border border-rose-400/30"
                delay={0.4}
              />
            )}
          </div>

          {/* Charts Section 1: Comparisons & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <ChartCard title="Sales Comparison" subtitle="Current vs Previous Period" delay={0.4} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.sales_comparison || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} interval={3} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(value) => [`£${value}`, "Revenue"]}
                  />
                  <Bar dataKey="previous" name="Previous Period" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={8} fillOpacity={0.5} />
                  <Bar dataKey="current" name="Selected Period" fill="#34d399" radius={[4, 4, 0, 0]} barSize={8} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average Order Value" subtitle="Trend over time" delay={0.5} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.avg_order_cost || []}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} interval={3} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => `£${Math.round(v)}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(value) => [`£${Number(value).toFixed(2)}`, "Avg Value"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Orders Trend" subtitle="Selected Range Distribution" delay={0.6} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weekly_orders || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(str) => new Date(str).getDate()} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/* Charts Section 2: Top Products & Table */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Top Selling Products (Replaced Pie Chart) */}
            <div className="xl:col-span-1">
              <ChartCard title="Top Selling Items" subtitle="Most popular products" delay={0.7} className="h-fit">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.top_selling_products && stats.top_selling_products.length > 0 ? (
                    stats.top_selling_products.map((product, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">

                        {/* Rank & Image */}
                        <div className="relative w-12 h-12 shrink-0">
                          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center z-10 border border-[#1a1c23] shadow-md">
                            {idx + 1}
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden ring-1 ring-white/10">
                            {product.image ? (
                              <img
                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')}/uploads/${product.image.replace(/^uploads\//, '')}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag size={20} className="m-auto text-white/30 h-full" />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-white text-sm truncate">{product.name}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-emerald-400 text-xs font-bold">£{Number(product.price || 0).toFixed(2)}</span>
                            <span className="text-white/30 text-[10px]">•</span>
                            <span className="text-white/50 text-xs text-xs">{product.count} sales</span>
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-500/30"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-white/40 py-10">No sales data available</div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Recent Orders Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="xl:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-400" /> Recent Orders
                </h2>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4">Order No</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm">
                    {loading ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-white/40">Loading orders...</td></tr>
                    ) : currentOrders.length > 0 ? (
                      currentOrders.map((order, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-medium">#{order.order_number}</td>
                          <td className="px-6 py-4 text-white/80">{order.customer_name || "Guest"}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-300">{formatCurrency(order.grand_total)}</td>
                          <td className="px-6 py-4">{getStatusBadge(order.order_status)}</td>
                          <td className="px-6 py-4 text-white/60">
                            {new Date(order.created_at).toLocaleDateString()}
                            <br />
                            <span className="text-xs text-white/40">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all shadow-md active:scale-95"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-white/40">No orders found for this date</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {stats.recent_orders?.length > ordersPerPage && (
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/5">
                  <div className="text-sm text-white/60">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Restaurant Wise Data (Super Admin) */}
          {stats.is_super_admin && stats.restaurant_performance?.length > 0 && (
            <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Store size={20} className="text-emerald-400" /> Restaurant Performance
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/60 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Restaurant</th>
                      <th className="px-6 py-4 text-center">Orders</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {stats.restaurant_performance.map((perf, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-6 py-4 font-medium text-white">{perf.restaurant_name}</td>
                        <td className="px-6 py-4 text-center text-white/70">{perf.order_count}</td>
                        <td className="px-6 py-4 text-right text-emerald-300 font-bold">{formatCurrency(perf.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
        {selectedProduct && (
          <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>

    </div>
  );
}
