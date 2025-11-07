import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 backdrop-blur-xl border-b border-emerald-100 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)]">
      <div className="h-full w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex lg:hidden items-center justify-center h-10 w-10 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/70 transition active:scale-[0.97]"
          >
            <svg className="h-5 w-5 text-emerald-800" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <img
            src="/Crispy-Dosalogo.png"
            alt="Crispy Dosa"
            className="h-11 sm:h-16 -mb-2 w-auto object-contain select-none"
            draggable="false"
          />
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 transition"
          >
            <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="7" r="4" strokeWidth="2"/>
              <path d="M6 20c0-3 3-5 6-5s6 2 6 5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-emerald-100 shadow-lg rounded-lg py-2">
              <button onClick={() => navigate("/restuarent")} className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50">Profile Info</button>
              <button onClick={() => navigate("/reset-password")} className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50">Reset Password</button>
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Logout</button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
