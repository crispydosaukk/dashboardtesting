import React, { useEffect, useState, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

function safeNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

export default function Orders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filters
  const [searchOrder, setSearchOrder] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const updateOrderStatus = async (orderNumber, status) => {
  try {
    await api.post("/mobile/orders/update-status", {
      order_number: orderNumber,
      status
    });

    // reload orders after update
    loadOrders();
  } catch (err) {
    console.error("Status update failed:", err);
    alert("Failed to update order");
  }
};


  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get("/mobile/orders");

      if (res.data.status === 1 && Array.isArray(res.data.orders)) {
        const mapped = res.data.orders.map((o) => ({
          ...o,
          restaurant_name:
            o.restaurant_name || o.restaurantName || o.restaurant || "-",
        }));
        setOrders(mapped);
        setFilteredOrders(mapped);
      }
    } catch (err) {
      console.error("Order fetch error:", err);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 1:
        return "text-blue-600";
      case 2:
        return "text-red-600";
      case 3:
        return "text-purple-600";
      case 4:
        return "text-green-700";
      case 5:
        return "text-red-700";
      default:
        return "text-yellow-600";
    }
  };

  const statusText = (status) => {
    switch (status) {
      case 0:
        return "Placed";
      case 1:
        return "Accepted";
      case 2:
        return "Rejected";
      case 3:
        return "Ready";
      case 4:
        return "Delivered";
      case 5:
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  // Apply Filters on raw items
  useEffect(() => {
    let data = [...orders];

    if (searchOrder.trim() !== "") {
      data = data.filter((o) =>
        (o.order_number || "")
          .toLowerCase()
          .includes(searchOrder.toLowerCase())
      );
    }

    if (filterPayment !== "all") {
      data = data.filter((o) =>
        filterPayment === "cod" ? o.payment_mode === 0 : o.payment_mode === 1
      );
    }

    if (filterStatus !== "all") {
      data = data.filter((o) => o.order_status?.toString() === filterStatus);
    }

    if (fromDate) {
      data = data.filter((o) => {
        const orderDate = new Date(o.created_at).setHours(0, 0, 0, 0);
        const from = new Date(fromDate).setHours(0, 0, 0, 0);
        return orderDate >= from;
      });
    }

    if (toDate) {
      data = data.filter((o) => {
        const orderDate = new Date(o.created_at).setHours(0, 0, 0, 0);
        const to = new Date(toDate).setHours(0, 0, 0, 0);
        return orderDate <= to;
      });
    }

    setFilteredOrders(data);
    setCurrentPage(1);
  }, [searchOrder, filterPayment, filterStatus, fromDate, toDate, orders]);

  // Group by order_number
  const groupedOrders = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o, idx) => {
      const key = o.order_number || `ORDER_${idx}`;
      if (!map[key]) {
        map[key] = {
          ...o,
          items: [],
        };
      }
      map[key].items.push(o);
    });
    return Object.values(map);
  }, [filteredOrders]);

  // Pagination on grouped data
  const totalPages = Math.ceil(groupedOrders.length / rowsPerPage) || 1;
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentOrders = groupedOrders.slice(indexOfFirst, indexOfLast);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <div className="flex-1 px-4 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-emerald-700 mb-6">
            Order Management
          </h1>

          {/* FILTER SECTION */}
          <div className="bg-white shadow-md p-4 rounded-lg mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search Order No..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Payment Modes</option>
              <option value="cod">COD</option>
              <option value="online">Online</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="0">Placed</option>
              <option value="1">Accepted</option>
              <option value="2">Rejected</option>
              <option value="3">Ready</option>
              <option value="4">Delivered</option>
              <option value="5">Cancelled</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-emerald-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Order Date
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Order No
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Restaurant Name
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Product(s)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Price (£)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Discount (£)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    VAT (£)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Qty</th>

                  {/* ✅ NEW SEQUENCE: Gross -> Wallet Used -> Grand (Paid) */}
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Gross Total (£)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Wallet Used (£)
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Loyalty Used (£)
                  </th>

                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Grand Total (£)
                  </th>

                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Payment Mode
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Car Name
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Car Color
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Reg Number
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Collection Method
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Allergy Note
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentOrders.map((order, index) => {
                  const items = order.items || [];

                  const totalQty = items.reduce(
                    (sum, item) => sum + safeNumber(item.quantity),
                    0
                  );
                  const totalPrice = items.reduce(
                    (sum, item) =>
                      sum + safeNumber(item.price) * safeNumber(item.quantity),
                    0
                  );
                  const totalDiscount = items.reduce(
                    (sum, item) => sum + safeNumber(item.discount_amount),
                    0
                  );
                  const totalVat = items.reduce(
                    (sum, item) => sum + safeNumber(item.vat),
                    0
                  );

                  // line total based on price/discount/vat aggregation
                  const lineTotal = totalPrice - totalDiscount + totalVat;

                  // ✅ Gross total (before wallet) from backend if present
                  const grossTotal =
                    items.reduce((sum, item) => {
                      const g = safeNumber(item.gross_total);
                      return sum + (g > 0 ? g : 0);
                    }, 0) || lineTotal;

                  // ✅ Wallet used (usually stored on first row, but sum is safe)
                  const walletUsed = items.reduce((sum, item) => {
                    return sum + safeNumber(item.wallet_amount);
                  }, 0);
                  const loyaltyUsed = items.reduce((sum, item) => {
                    return sum + safeNumber(item.loyalty_amount);
                  }, 0);

                  // ✅ Paid amount after wallet => sum of grand_total
                  const paidTotal =
                    items.reduce((sum, item) => {
                      return sum + safeNumber(item.grand_total);
                    }, 0) || Math.max(0, lineTotal - walletUsed);

                  return (
                    <tr
                      key={index}
                      className="border-b hover:bg-emerald-50 transition"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.restaurant_name || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.customer_name || "-"}
                      </td>

                      {/* Product list with price + qty */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {items.length === 0 && <span>-</span>}
                          {items.map((item, idx) => (
                            <div key={idx} className="leading-tight">
                              <div className="font-medium">
                                {item.product_name || "-"}
                              </div>
                              <div className="text-xs text-gray-500">
                                £{safeNumber(item.price).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Aggregated amounts */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        £{totalPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        £{totalDiscount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        £{totalVat.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{totalQty}</td>

                      {/* ✅ NEW columns (sequence) */}
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        £{grossTotal.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-red-700">
                        -£{walletUsed.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-purple-700">
                        -£{loyaltyUsed.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">
                        £{paidTotal.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.payment_mode === 0 ? "COD" : "Online"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.owner_name || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.car_color || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.reg_number || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.mobile_number || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.instore === 1 ? "Instore" : "Kerbside"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.allergy_note || "-"}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap font-semibold ${statusColor(
                          order.order_status
                        )}`}
                      >
                        {statusText(order.order_status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.order_status === 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.order_number, 1)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.order_number, 2)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {order.order_status === 1 && (
                          <button
                            onClick={() => updateOrderStatus(order.order_number, 3)}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-xs"
                          >
                            Mark Ready
                          </button>
                        )}

                        {order.order_status === 3 && (
                          <button
                            onClick={() => updateOrderStatus(order.order_number, 4)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                          >
                            Delivered
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (GROUPED) */}
          <div className="lg:hidden space-y-4 mt-4">
            {currentOrders.map((order, index) => {
              const items = order.items || [];

              const totalQty = items.reduce(
                (sum, item) => sum + safeNumber(item.quantity),
                0
              );
              const totalPrice = items.reduce(
                (sum, item) =>
                  sum + safeNumber(item.price) * safeNumber(item.quantity),
                0
              );
              const totalDiscount = items.reduce(
                (sum, item) => sum + safeNumber(item.discount_amount),
                0
              );
              const totalVat = items.reduce(
                (sum, item) => sum + safeNumber(item.vat),
                0
              );

              const lineTotal = totalPrice - totalDiscount + totalVat;

              const grossTotal =
                items.reduce((sum, item) => {
                  const g = safeNumber(item.gross_total);
                  return sum + (g > 0 ? g : 0);
                }, 0) || lineTotal;

              const walletUsed = items.reduce((sum, item) => {
                return sum + safeNumber(item.wallet_amount);
              }, 0);
              const loyaltyUsed = items.reduce((sum, item) => {
                return sum + safeNumber(item.loyalty_amount);
              }, 0);

              const paidTotal =
                items.reduce((sum, item) => {
                  return sum + safeNumber(item.grand_total);
                }, 0) || Math.max(0, lineTotal - walletUsed);

              return (
                <div
                  key={index}
                  className="bg-white shadow-md p-4 rounded-xl border"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-emerald-700">
                      {order.order_number}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {statusText(order.order_status)}
                    </span>
                  </div>

                  <p className="text-sm mb-1">
                    <strong>Date:</strong> {formatDate(order.created_at)}
                  </p>
                  <p className="text-sm mb-1">
                    <strong>Restaurant:</strong> {order.restaurant_name || "-"}
                  </p>
                  <p className="text-sm mb-1">
                    <strong>Customer:</strong> {order.customer_name || "-"}
                  </p>

                  <div className="mt-2 mb-2">
                    <p className="font-semibold text-sm mb-1">Products:</p>
                    <div className="space-y-1">
                      {items.length === 0 && (
                        <div className="text-xs text-gray-500">-</div>
                      )}
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs bg-emerald-50/60 rounded-md px-2 py-1"
                        >
                          <span className="font-medium">
                            {item.product_name || "-"}
                          </span>
                          <span className="text-gray-600">
                            £{safeNumber(item.price).toFixed(2)} · Qty{" "}
                            {safeNumber(item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <strong>Qty:</strong> {totalQty}
                    </p>
                    <p>
                      <strong>Price:</strong> £{totalPrice.toFixed(2)}
                    </p>
                    <p>
                      <strong>Discount:</strong> £{totalDiscount.toFixed(2)}
                    </p>
                    <p>
                      <strong>VAT:</strong> £{totalVat.toFixed(2)}
                    </p>

                    {/* ✅ NEW breakdown */}
                    <p className="col-span-2">
                      <strong>Gross Total:</strong> £{grossTotal.toFixed(2)}
                    </p>

                    <p className="col-span-2 text-red-700 font-semibold">
                      <strong>Wallet Used:</strong> -£{walletUsed.toFixed(2)}
                    </p>
                    <p className="col-span-2 text-purple-700 font-semibold">
                      <strong>Loyalty Used:</strong> -£{loyaltyUsed.toFixed(2)}
                    </p>

                    <p className="font-semibold text-emerald-700 col-span-2">
                      <strong>Grand Total (Paid):</strong> £{paidTotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <p>
                      <strong>Payment:</strong>{" "}
                      {order.payment_mode === 0 ? "COD" : "Online"}
                    </p>
                    <p>
                      <strong>Car Name:</strong> {order.owner_name || "-"}
                    </p>
                    <p>
                      <strong>Car Color:</strong> {order.car_color || "-"}
                    </p>
                    <p>
                      <strong>Reg No:</strong> {order.reg_number || "-"}
                    </p>
                    <p>
                      <strong>Mobile:</strong> {order.mobile_number || "-"}
                    </p>
                    <p>
                      <strong>Collection:</strong>{" "}
                      {order.instore === 1 ? "Instore" : "Kerbside"}
                    </p>
                    <p className="col-span-2">
                      <strong>Allergy:</strong> {order.allergy_note || "-"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION */}
          <div className="flex justify-center items-center mt-6 gap-3 select-none">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg border ${currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100 text-gray-700"
                }`}
            >
              Previous
            </button>
            

            {[...Array(totalPages).keys()].map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num + 1)}
                className={`px-4 py-2 rounded-lg border ${currentPage === num + 1
                  ? "bg-emerald-600 text-white"
                  : "bg-white hover:bg-gray-100"
                  }`}
              >
                {num + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg border ${currentPage === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100 text-gray-700"
                }`}
            >
              Next
            </button>
          </div>
        </div>
       
        <Footer />
      </div>
    </div>
  );
}
