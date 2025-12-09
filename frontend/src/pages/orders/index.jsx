import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

export default function Orders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);

  // 🔥 Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // You can change to 20 or 50

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get("/mobile/orders");

      if (res.data.status === 1) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error("Order fetch error:", err);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 1:
        return "text-blue-600"; // Accepted
      case 2:
        return "text-red-600"; // Rejected
      case 3:
        return "text-purple-600"; // Ready
      case 4:
        return "text-green-700"; // Delivered
      case 5:
        return "text-red-700"; // Cancelled
      default:
        return "text-yellow-600"; // Placed
    }
  };

  // 🔥 Pagination calculations
  const totalPages = Math.ceil(orders.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentOrders = orders.slice(indexOfFirst, indexOfLast);

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="p-6 lg:ml-72 mt-16">
        <h1 className="text-3xl font-bold text-emerald-700 mb-6">
          Order Management
        </h1>

        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-emerald-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Order No</th>
                <th className="px-4 py-3 text-left">Payment Mode</th>

                <th className="px-4 py-3 text-left">Product Name</th>
                <th className="px-4 py-3 text-left">Price (£)</th>
                <th className="px-4 py-3 text-left">Discount (£)</th>
                <th className="px-4 py-3 text-left">VAT (£)</th>
                <th className="px-4 py-3 text-left">Qty</th>

                <th className="px-4 py-3 text-left">Total (£)</th>

                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Car Name</th>
                <th className="px-4 py-3 text-left">Car Color</th>
                <th className="px-4 py-3 text-left">Reg Number</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Collection Method</th>
                <th className="px-4 py-3 text-left">Allergy Note</th>
              </tr>
            </thead>

            <tbody>
              {currentOrders.map((o, index) => (
                <tr
                  key={`${o.order_number}_${index}`}
                  className="border-b hover:bg-emerald-50"
                >
                  <td className="px-4 py-3 font-semibold">{o.order_number}</td>

                  <td className="px-4 py-3">
                    {o.payment_mode === 0 ? "COD" : "Online"}
                  </td>

                  <td className="px-4 py-3">{o.product_name}</td>
                  <td className="px-4 py-3">£{o.price}</td>
                  <td className="px-4 py-3">£{o.discount_amount}</td>
                  <td className="px-4 py-3">£{o.vat}</td>

                  <td className="px-4 py-3">{o.quantity}</td>

                  <td className="px-4 py-3 font-semibold">£{o.grand_total}</td>

                  <td
                    className={`px-4 py-3 font-semibold ${statusColor(
                      o.order_status
                    )}`}
                  >
                    {o.order_status}
                  </td>

                  <td className="px-4 py-3">{o.car_color || "-"}</td>
                  <td className="px-4 py-3">{o.reg_number || "-"}</td>
                  <td className="px-4 py-3">{o.owner_name || "-"}</td>
                  <td className="px-4 py-3">{o.mobile_number || "-"}</td>

                  <td className="px-4 py-3">
                    {o.instore === 1 ? "Kerbside" : "Instore"}
                  </td>

                  <td className="px-4 py-3">{o.allergy_note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🔥 PAGINATION UI */}
        <div className="flex justify-center items-center mt-6 gap-3 select-none">

          {/* Previous Button */}
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

          {/* Page Numbers */}
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

          {/* Next Button */}
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
