import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api.js";

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifyRef = useRef(null);

  const token = localStorage.getItem("token");

  const [openMenu, setOpenMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [orders, setOrders] = useState([]);

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ============== CLOSE ON OUTSIDE CLICK ============== */
  useEffect(() => {
    const close = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        notifyRef.current &&
        !notifyRef.current.contains(e.target)
      ) {
        setOpenMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ================= FETCH NEW ORDERS ================= */
  const fetchNewOrders = async () => {
    if (!token) return;

    try {
      const res = await api.get("/mobile/orders");

      if (res.data.status !== 1) {
        console.error("Orders fetch failed:", res.data.message);
        return;
      }

      const allOrders = res.data.orders || [];

      // Group by order_number to avoid duplicates (since orders table has one row per item)
      const uniqueOrdersMap = {};
      allOrders.forEach(o => {
        if (!uniqueOrdersMap[o.order_number]) {
          uniqueOrdersMap[o.order_number] = o;
        }
      });

      const uniqueOrders = Object.values(uniqueOrdersMap);

      // Filter only NEW orders (order_status = 0)
      const newOrders = uniqueOrders.filter((o) => Number(o.order_status) === 0);

      setOrders((prev) => {
        // Play sound if we have MORE orders than before (meaning a new one arrived)
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

  /* ================= POLLING ================= */
  useEffect(() => {
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ================= ACCEPT ORDER ================= */
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
    } catch {
      alert("Failed to accept order");
    }
  };

  /* ================= REJECT ORDER ================= */
  const handleReject = async (order) => {
    try {
      await api.post("/mobile/orders/update-status", {
        order_number: order.order_number,
        status: 2,
      });

      fetchNewOrders();
    } catch {
      alert("Failed to reject order");
    }
  };

  /* ================= UI ================= */
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b shadow">
      <div className="h-full w-full px-4 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded bg-emerald-100"
          >
            ☰
          </button>

          <img
            src="/Crispy-Dosalogo.png"
            alt="Crispy Dosa"
            className="h-14"
          />
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* 🔔 NOTIFICATION */}
          <div className="relative" ref={notifyRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 rounded bg-emerald-100"
            >
              🔔
              {orders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded border shadow-lg">
                <div className="px-4 py-2 font-semibold border-b">
                  New Orders
                </div>

                {orders.length === 0 ? (
                  <div className="p-4 text-gray-500">No new orders</div>
                ) : (
                  orders.map((order) => (
                    <div key={order.order_number} className="p-4 border-b">
                      <p className="font-semibold">
                        Order #{order.order_number}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAccept(order)}
                          className="flex-1 bg-green-600 text-white py-1 rounded"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(order)}
                          className="flex-1 bg-red-600 text-white py-1 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 👤 PROFILE */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="px-3 py-2 border rounded"
            >
              👤 ▼
            </button>

            {openMenu && (
              <div className="absolute right-0 mt-3 w-48 bg-white border rounded shadow">
                <button
                  onClick={() => navigate("/restuarent")}
                  className="block w-full px-4 py-2 text-left hover:bg-slate-100"
                >
                  Profile Information
                </button>
                <button
                  onClick={() => navigate("/reset-password")}
                  className="block w-full px-4 py-2 text-left hover:bg-slate-100"
                >
                  Reset Password
                </button>
                <div className="border-t my-1" />
                <button
                  onClick={logout}
                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
