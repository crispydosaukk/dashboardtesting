import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion } from "framer-motion";
import axios from "axios";
import api from "../../api.js";

export default function CustomerInfo() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");

  // Example API call – replace URL with your actual endpoint
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/customers");
        setCustomers(res.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile_number.includes(search)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 font-jakarta flex flex-col">
      {/* Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6"
            >
              <h1 className="text-2xl font-bold text-emerald-700">
                Customer Information
              </h1>

              <input
                type="text"
                placeholder="Search by name or mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-3 sm:mt-0 px-4 py-2 w-full sm:w-72 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </motion.div>

            {/* Table / Card view */}
            <div className="overflow-x-auto rounded-lg bg-white shadow-xl border border-gray-100">
              {/* Desktop Table View */}
              <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-emerald-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">#</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Country Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold tracking-wide">Created At</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c, i) => (
                      <tr
                        key={c.id}
                        className="hover:bg-emerald-50 transition duration-200 ease-in-out"
                      >
                        <td className="px-6 py-3 text-sm text-gray-700">{i + 1}</td>

                        {/* Avatar + Name */}
                        <td className="px-6 py-3 flex items-center space-x-3">
                          <img
                            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                            alt="avatar"
                            className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover"
                          />
                          <span className="text-sm font-semibold text-gray-900">
                            {c.full_name}
                          </span>
                        </td>

                        <td className="px-6 py-3 text-sm text-gray-700">{c.country_code}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{c.mobile_number}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{c.email || "—"}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {new Date(c.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                          alt="avatar"
                          className="w-12 h-12 rounded-full border border-gray-200 shadow-sm object-cover"
                        />
                        <h3 className="text-lg font-semibold text-emerald-700">
                          {c.full_name}
                        </h3>
                      </div>

                      <p className="text-gray-600 text-sm">
                        <strong>Mobile:</strong> {c.country_code} {c.mobile_number}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        <strong>Email:</strong> {c.email || "N/A"}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        Created: {new Date(c.created_at).toLocaleString()}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-10">No customers found</p>
                )}
              </div>
            </div>


          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
