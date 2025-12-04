import React, { useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

export default function ManualOrders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
            Manual Order Assign
          </h1>

          <div className="rounded-xl bg-white p-6 shadow-sm border">
            <p className="text-gray-800 text-base">Hello, welcome to Manual Order Assign.</p>
          </div>
        </main>

        <footer className="mt-auto"><Footer /></footer>
      </div>
    </div>
  );
}
