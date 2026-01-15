import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X } from "lucide-react";
import api from "../../api.js";

export default function Header({ onToggleSidebar, darkMode = true }) {
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
      ? "h-16 bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-lg"
      : "h-20 bg-transparent"
      }`}>
      <div className="h-full w-full px-4 sm:px-6 flex items-center justify-between">

        {/* LEFT: Branding & Toggle */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10 transition-colors">
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispy Dosa"
              className={`h-12 sm:h-14 w-auto transition-all duration-300 drop-shadow-md ${scrolled ? "scale-90" : "scale-100"}`}
            />
          </div>
        </div>

        {/* MIDDLE: Search - Hidden on small screens */}
        <div className="hidden lg:flex flex-1 max-w-md mx-auto relative px-4">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-white/50 group-focus-within:text-emerald-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm bg-white/10 border-white/10 text-white placeholder-white/40 focus:bg-white/20 focus:ring-emerald-400/30 focus:border-white/20 shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs border rounded px-1.5 py-0.5 text-white/30 border-white/10">⌘K</span>
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
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-white hover:bg-white/10'
                }`}
            >
              <Bell size={20} />
              {orders.length > 0 && (
                <span className="absolute top-2 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-20 sm:top-auto sm:mt-4 w-auto sm:w-96 max-w-md bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="font-semibold text-white text-sm sm:text-base">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {orders.length > 0 && <span className="text-xs font-medium px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">{orders.length} New</span>}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="sm:hidden p-1 hover:bg-white/10 text-white rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {orders.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center flex flex-col items-center text-white/40">
                      <Bell size={40} className="mb-3 text-white/20" strokeWidth={1} />
                      <p className="text-sm">No new orders</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {orders.map((order) => (
                        <div key={order.order_number} className="p-4 sm:p-5 hover:bg-white/5 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-white text-sm sm:text-base">Order #{order.order_number}</p>
                              <p className="text-xs text-white/50 mt-1">Just now</p>
                            </div>
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium rounded whitespace-nowrap">New Order</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                            <button
                              onClick={() => handleAccept(order)}
                              className="flex items-center justify-center py-2 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(order)}
                              className="flex items-center justify-center py-2 px-3 sm:px-4 bg-white/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs sm:text-sm font-medium rounded-lg transition-colors"
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

          <div className="h-6 sm:h-8 w-px hidden sm:block bg-white/20"></div>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="flex items-center gap-2 sm:gap-3 p-1 rounded-full hover:bg-white/5 transition-all pr-2 sm:pr-4 border border-transparent hover:border-white/10"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 border border-white/20">
                A
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold leading-none text-white">Admin</p>
                <p className="text-[10px] mt-1 font-medium tracking-wide text-white/60">SUPER ADMIN</p>
              </div>
              <ChevronDown size={14} className="hidden sm:block text-white/60" />
            </button>

            {/* Profile Dropdown */}
            {openMenu && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-20 sm:top-auto sm:mt-4 w-[calc(100vw-1rem)] sm:w-56 max-w-xs bg-white/10 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-2">
                  <button
                    onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={() => { navigate("/restuarent"); setOpenMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Settings size={16} /> Settings
                  </button>
                </div>
                <div className="border-t border-white/10 p-2">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/20 rounded-lg flex items-center gap-2 transition-colors"
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
              <Search size={16} className="text-white/40" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-9 pr-3 py-2 border border-white/10 rounded-lg text-sm bg-white/10 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-emerald-500/30 focus:border-white/20 transition-all"
            />
          </div>
        </div>
      )}
    </header>
  );
}
