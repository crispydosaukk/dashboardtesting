import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X } from "lucide-react";
import api from "../../api.js";

export default function Header({ onToggleSidebar }) {
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

  // Fetch Orders (existing logic)
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100" : "h-20 bg-transparent"
      }`}>
      <div className="h-full w-full px-6 flex items-center justify-between">

        {/* LEFT: Branding & Toggle */}
        <div className="flex items-center gap-6">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispy Dosa"
              className={`h-13 w-auto transition-all duration-300 ${scrolled ? "scale-95" : "scale-100"}`}
            />
          </div>

          {/* Breadcrumbs / Page Title Placeholder */}
          <div className="hidden md:flex items-center text-sm ml-4 pl-4 border-l border-gray-300 h-6 text-gray-400">
            <span>Dashboard</span>
            <span className="mx-2">/</span>
            <span className="text-gray-800 font-medium">Overview</span>
          </div>
        </div>

        {/* MIDDLE: Search (Premium Element) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-auto relative px-4">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 sm:text-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-5">

          {/* Notifications */}
          <div className="relative" ref={notifyRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={`relative p-2.5 rounded-xl transition-all duration-200 ${showNotifications ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:bg-gray-100'}`}
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
              <div className="absolute right-0 mt-4 w-96 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {orders.length > 0 && <span className="text-xs font-medium px-2 py-1 bg-rose-100 text-rose-600 rounded-full">{orders.length} New</span>}
                </div>

                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center text-gray-400">
                      <Bell size={48} className="mb-3 text-gray-200" strokeWidth={1} />
                      <p>No new orders</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {orders.map((order) => (
                        <div key={order.order_number} className="p-5 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900">Order #{order.order_number}</p>
                              <p className="text-xs text-gray-500 mt-1">Just now</p>
                            </div>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">New Order</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                              onClick={() => handleAccept(order)}
                              className="flex items-center justify-center py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-200"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(order)}
                              className="flex items-center justify-center py-2 px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium rounded-lg transition-colors"
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

          <div className="h-8 w-px bg-gray-200/60 hidden sm:block"></div>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-50 transition-all pr-4 border border-transparent hover:border-gray-100"
            >
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-slate-300">
                A
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-700 leading-none">Admin</p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium tracking-wide">SUPER ADMIN</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {openMenu && (
              <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-2">
                  <button
                    onClick={() => navigate("/restuarent")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-emerald-600 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={() => navigate("/restuarent")}
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

      {/* Mobile Search - Visible only on small screens when scrolled or needed */}
      <div className="lg:hidden px-6 pb-4">
        {/* Could act as expandable search */}
      </div>
    </header>
  );
}
