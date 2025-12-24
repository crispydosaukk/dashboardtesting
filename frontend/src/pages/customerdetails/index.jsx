import React, { useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

const CustomerDetails = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const dummyCustomers = [
        { id: 1, name: "John Doe", email: "john@example.com", phone: "+1 234 567 890", status: "Active" },
        { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "+1 987 654 321", status: "Inactive" },
        { id: 3, name: "Alice Johnson", email: "alice@example.com", phone: "+1 555 123 456", status: "Active" },
        { id: 4, name: "Bob Brown", email: "bob@example.com", phone: "+1 444 987 654", status: "Pending" },
        { id: 5, name: "Charlie Davis", email: "charlie@example.com", phone: "+1 666 777 888", status: "Active" },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col pt-16 lg:pl-72">
                <main className="flex-1 px-4 lg:px-8 py-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-2xl font-bold text-emerald-700 mb-6">Customer Details</h1>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">ID</th>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Email</th>
                                            <th className="px-6 py-3">Phone</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dummyCustomers.map((customer) => (
                                            <tr key={customer.id} className="bg-white border-b border-gray-50 hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{customer.id}</td>
                                                <td className="px-6 py-4 text-gray-900 font-medium">{customer.name}</td>
                                                <td className="px-6 py-4">{customer.email}</td>
                                                <td className="px-6 py-4">{customer.phone}</td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${customer.status === "Active"
                                                                ? "bg-green-100 text-green-800"
                                                                : customer.status === "Inactive"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-yellow-100 text-yellow-800"
                                                            }`}
                                                    >
                                                        {customer.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button className="text-blue-600 hover:underline mr-3">Edit</button>
                                                    <button className="text-red-600 hover:underline">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {dummyCustomers.length === 0 && (
                                <div className="p-6 text-center text-gray-500">
                                    No customer details found.
                                </div>
                            )}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default CustomerDetails;
