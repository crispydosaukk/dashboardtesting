import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Crispydosa. All rights reserved.
      </div>
    </footer>
  );
}
