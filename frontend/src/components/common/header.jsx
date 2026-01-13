import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X } from "lucide-react";
import api from "../../api.js";

export default function Header({ onToggleSidebar, darkMode = false }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifyRef = useRef(null);
  const token = localStorage.getItem("token");

  const [openMenu, setOpenMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [orders, setOrders] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  // Logout
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Orders
  const fetchNewOrders = async () => {
    if (!token) return;
    try {
      const res = await api.get("/mobile/orders");
      if (res.data.status !== 1) return;

      const allOrders = res.data.orders || [];
      const uniqueOrdersMap = {};
      allOrders.forEach(o => {
        if (!uniqueOrdersMap[o.order_number]) uniqueOrdersMap[o.order_number] = o;
      });
      const uniqueOrders = Object.values(uniqueOrdersMap);
      const newOrders = uniqueOrders.filter((o) => Number(o.order_status) === 0);

      setOrders((prev) => {
        if (newOrders.length > prev.length) {
          const audio = new Audio("/message.mp3");
          audio.play().catch((err) => console.log("Audio play failed:", err));
        }
        return newOrders;
      });
    } catch (err) {
      console.error("Notification fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (order) => {
    const minutes = prompt("Ready in how many minutes?");
    if (!minutes || Number(minutes) <= 0) return;
    try {
      await api.post("/mobile/orders/update-status", {
        order_number: order.order_number,
        status: 1,
        ready_in_minutes: Number(minutes),
      });
      fetchNewOrders();
    } catch { alert("Failed to accept order"); }
  };

  const handleReject = async (order) => {
    try {
      await api.post("/mobile/orders/update-status", { order_number: order.order_number, status: 2 });
      fetchNewOrders();
    } catch { alert("Failed to reject order"); }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
      ? (darkMode ? "h-16 bg-[#0f172a]/80 backdrop-blur-md shadow-lg border-b border-white/10" : "h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100")
      : "h-20 bg-transparent"
      }`}>
      <div className="h-full w-full px-4 sm:px-6 flex items-center justify-between">

        {/* LEFT: Branding & Toggle */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={onToggleSidebar} className={`lg:hidden p-2 rounded-lg transition-colors ${darkMode ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispy Dosa"
              className={`h-12 sm:h-16 w-auto transition-all duration-300 ${scrolled ? "scale-90" : "scale-100"}`}
            />
          </div>
        </div>

        {/* MIDDLE: Search - Hidden on small screens */}
        <div className="hidden lg:flex flex-1 max-w-md mx-auto relative px-4">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className={`${darkMode ? 'text-white/50' : 'text-gray-400'} group-focus-within:text-emerald-500 transition-colors`} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm ${darkMode
                ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:ring-emerald-400/30 focus:border-emerald-400'
                : 'bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={`text-xs border rounded px-1.5 py-0.5 ${darkMode ? 'text-white/40 border-white/20' : 'text-gray-400 border-gray-200'}`}>⌘K</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3 sm:gap-5">

          {/* Notifications */}
          <div className="relative" ref={notifyRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${showNotifications
                ? 'bg-emerald-50 text-emerald-600'
                : (darkMode ? 'text-white hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100')
                }`}
            >
              <Bell size={20} />
              {orders.length > 0 && (
                <span className="absolute top-1.5 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* Notification Dropdown - Mobile Responsive */}
            {showNotifications && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-20 sm:top-auto sm:mt-4 w-auto sm:w-96 max-w-md bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {orders.length > 0 && <span className="text-xs font-medium px-2 py-1 bg-rose-100 text-rose-600 rounded-full">{orders.length} New</span>}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="sm:hidden p-1 hover:bg-gray-200 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                  {orders.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center flex flex-col items-center text-gray-400">
                      <Bell size={40} className="mb-3 text-gray-200" strokeWidth={1} />
                      <p className="text-sm">No new orders</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.map((order) => (
                        <div key={order.order_number} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900 text-sm sm:text-base">Order #{order.order_number}</p>
                              <p className="text-xs text-gray-500 mt-1">Just now</p>
                            </div>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded whitespace-nowrap">New Order</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                            <button
                              onClick={() => handleAccept(order)}
                              className="flex items-center justify-center py-2 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-200"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(order)}
                              className="flex items-center justify-center py-2 px-3 sm:px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-medium rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`h-6 sm:h-8 w-px hidden sm:block ${darkMode ? 'bg-white/20' : 'bg-gray-200/60'}`}></div>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="flex items-center gap-2 sm:gap-3 p-1 rounded-full hover:bg-white/5 transition-all pr-2 sm:pr-4 border border-transparent hover:border-white/10"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20">
                A
              </div>
              <div className="text-left hidden sm:block">
                <p className={`text-sm font-semibold leading-none ${darkMode ? 'text-white' : 'text-gray-700'}`}>Admin</p>
                <p className={`text-[10px] mt-1 font-medium tracking-wide ${darkMode ? 'text-white/70' : 'text-gray-400'}`}>SUPER ADMIN</p>
              </div>
              <ChevronDown size={14} className={`hidden sm:block ${darkMode ? 'text-white/70' : 'text-gray-400'}`} />
            </button>

            {/* Profile Dropdown - Mobile Responsive */}
            {openMenu && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-20 sm:top-auto sm:mt-4 w-[calc(100vw-1rem)] sm:w-56 max-w-xs bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-2">
                  <button
                    onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-emerald-600 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-emerald-600 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Settings size={16} /> Settings
                  </button>
                </div>
                <div className="border-t border-gray-50 p-2">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Search - Expandable on small screens */}
      {!scrolled && (
        <div className="lg:hidden px-4 pb-3 pt-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      )}
    </header>
  );
}
