import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { ImSpinner2 } from "react-icons/im";

const CustomerDetails = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/customers/by-user");
            setCustomers(res.data || []);
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError("Failed to load customer details");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col pt-16 lg:pl-72">
                <main className="flex-1 px-4 lg:px-8 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-emerald-700">Customer Details</h1>
                            <button
                                onClick={fetchCustomers}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                            >
                                Refresh
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">ID</th>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Email / Phone</th>
                                            <th className="px-6 py-3 text-center">Live Orders</th>
                                            <th className="px-6 py-3 text-center">Completed</th>
                                            <th className="px-6 py-3 text-center">Total Orders</th>
                                            <th className="px-6 py-3">Last Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center">
                                                    <div className="flex justify-center items-center text-emerald-600">
                                                        <ImSpinner2 className="animate-spin text-2xl" />
                                                        <span className="ml-2">Loading customers...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : customers.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                                                    No customers found for your orders.
                                                </td>
                                            </tr>
                                        ) : (
                                            customers.map((customer) => (
                                                <tr key={customer.id} className="bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        #{customer.id}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900 font-medium">
                                                        {customer.full_name || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span>{customer.email || "-"}</span>
                                                            <span className="text-xs text-gray-400">{customer.mobile_number || "-"}</span>
                                                        </div>
                                                    </td>

                                                    {/* LIVE ORDERS */}
                                                    <td className="px-6 py-4 text-center">
                                                        {Number(customer.live_orders) > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                                                                {customer.live_orders} Active
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>

                                                    {/* COMPLETED */}
                                                    <td className="px-6 py-4 text-center text-gray-600">
                                                        {customer.completed_orders || 0}
                                                    </td>

                                                    {/* TOTAL */}
                                                    <td className="px-6 py-4 text-center font-semibold text-emerald-700">
                                                        {customer.total_orders || 0}
                                                    </td>

                                                    <td className="px-6 py-4 text-xs text-gray-500">
                                                        {customer.last_seen ? new Date(customer.last_seen).toLocaleDateString() : "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default CustomerDetails;
