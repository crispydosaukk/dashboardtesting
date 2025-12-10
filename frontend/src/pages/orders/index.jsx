import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

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

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get("/mobile/orders");

      if (res.data.status === 1) {
        setOrders(res.data.orders);
        setFilteredOrders(res.data.orders);
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
    case 0: return "Placed";
    case 1: return "Accepted";
    case 2: return "Rejected";
    case 3: return "Ready";
    case 4: return "Delivered";
    case 5: return "Cancelled";
    default: return "Unknown";
  }
};


  // Apply Filters
  useEffect(() => {
    let data = [...orders];

    if (searchOrder.trim() !== "") {
      data = data.filter((o) =>
        o.order_number.toLowerCase().includes(searchOrder.toLowerCase())
      );
    }

    if (filterPayment !== "all") {
      data = data.filter((o) =>
        filterPayment === "cod" ? o.payment_mode === 0 : o.payment_mode === 1
      );
    }

    if (filterStatus !== "all") {
      data = data.filter((o) => o.order_status.toString() === filterStatus);
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

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirst, indexOfLast);

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="p-6 lg:ml-72 mt-16">
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
            className="border rounded-lg px-4 py-2 w-full"
          />

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
          >
            <option value="all">All Payment Modes</option>
            <option value="cod">COD</option>
            <option value="online">Online</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
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
            className="border rounded-lg px-4 py-2 w-full"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
          />
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-emerald-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Order Date</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Order No</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Restaurant Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Customer Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Product Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Price (£)</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Discount (£)</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">VAT (£)</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Qty</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Total (£)</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Payment Mode</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Car Name</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Car Color</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Reg Number</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Mobile</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Collection Method</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Allergy Note</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
              </tr>
            </thead>

            <tbody>
              {currentOrders.map((o, index) => (
                <tr key={index} className="border-b hover:bg-emerald-50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">{o.order_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.restaurant_name || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.customer_name || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.product_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">£{o.price}</td>
                  <td className="px-4 py-3 whitespace-nowrap">£{o.discount_amount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">£{o.vat}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.quantity}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">£{o.grand_total}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {o.payment_mode === 0 ? "COD" : "Online"}
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">{o.owner_name || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.car_color || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.reg_number || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.mobile_number || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {o.instore === 1 ? "Instore" : "Kerbside"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.allergy_note || "-"}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${statusColor(o.order_status)}`}>
                    {statusText(o.order_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW */}
        <div className="lg:hidden space-y-4 mt-4">
          {currentOrders.map((o, index) => (
            <div key={index} className="bg-white shadow-md p-4 rounded-xl border">
              <h3 className="font-bold text-lg text-emerald-700">
                {o.order_number}
              </h3>

              <p><strong>Date:</strong> {formatDate(o.created_at)}</p>
              <p><strong>Restaurant:</strong> {o.restaurant_name || "-"}</p>
              <p><strong>Customer:</strong> {o.customer_name || "-"}</p>
              <p><strong>Product:</strong> {o.product_name}</p>
              <p><strong>Price:</strong> £{o.price}</p>
              <p><strong>Discount:</strong> £{o.discount_amount}</p>
              <p><strong>VAT:</strong> £{o.vat}</p>
              <p><strong>Qty:</strong> {o.quantity}</p>
              <p><strong>Total:</strong> £{o.grand_total}</p>
              <p><strong>Payment:</strong> {o.payment_mode === 0 ? "COD" : "Online"}</p>
              <p><strong>Car Name:</strong> {o.owner_name || "-"}</p>
              <p><strong>Car Color:</strong> {o.car_color || "-"}</p>
              <p><strong>Reg No:</strong> {o.reg_number || "-"}</p>
              <p><strong>Mobile:</strong> {o.mobile_number || "-"}</p>
              <p><strong>Collection Method:</strong> {o.instore === 1 ? "Instore" : "Kerbside"}</p>
              <p><strong>Allergy:</strong> {o.allergy_note || "-"}</p>
              <p><strong>Status:</strong> {statusText(o.order_status)}</p>
            </div>
          ))}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center items-center mt-6 gap-3 select-none">
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg border ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400"
                : "bg-white hover:bg-gray-100 text-gray-700"
            }`}
          >
            Previous
          </button>

          {[...Array(totalPages).keys()].map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num + 1)}
              className={`px-4 py-2 rounded-lg border ${
                currentPage === num + 1
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
            className={`px-4 py-2 rounded-lg border ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-400"
                : "bg-white hover:bg-gray-100 text-gray-700"
            }`}
          >
            Next
          </button>
        </div>

        <Footer />
      </div>
    </>
  );
}
