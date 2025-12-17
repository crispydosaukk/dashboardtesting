import React, { useState } from "react";
import Header from "../common/header.jsx";
import Sidebar from "../common/sidebar.jsx";
import Footer from "../common/footer.jsx";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* ===== FIXED HEADER ===== */}
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />

      {/* ===== FIXED SIDEBAR ===== */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ===== MAIN AREA ===== */}
      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        {/* MAIN CONTENT */}
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              ["0", "Total Users"],
              ["0", "Total Orders"],
              ["0", "Total Completed Orders"],
              ["0", "Today's Orders"],
              ["0", "Total Complaint"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="bg-white rounded-xl border shadow-sm p-4"
              >
                <div className="text-3xl font-extrabold text-emerald-800">
                  {value}
                </div>
                <div className="mt-1 text-sm text-gray-600">{label}</div>
                <div className="mt-2 h-1 rounded bg-emerald-700/80" />
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <section className="mt-6 bg-white rounded-xl border shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Orders
              </h2>
            </div>
            <div className="p-4 text-sm text-gray-500">
              Table content goes here…
            </div>
          </section>
        </main>

        {/* ===== FOOTER STAYS AT BOTTOM ===== */}
        <footer className="mt-auto">
          <Footer />
        </footer>
      </div>
    </div>
  );
}
