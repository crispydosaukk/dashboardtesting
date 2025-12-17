import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 
      bg-white/90 backdrop-blur-2xl border-b border-emerald-100
      shadow-[0_4px_20px_-6px_rgba(0,0,0,0.18)] transition-all">
      
      <div className="h-full w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">

        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition active:scale-95"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 select-none">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispy Dosa"
              className="h-16 -mb-4 w-auto object-contain"
              draggable="false"
            />
            
          </div>
        </div>

        {/* Right: Profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpenMenu(v => !v)}
            className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white 
            hover:bg-emerald-50 hover:border-emerald-300 transition shadow-sm active:scale-95"
          >
            <svg className="w-6 h-6 text-emerald-700 group-hover:text-emerald-900 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="7" r="4" strokeWidth="2"/>
              <path d="M6 20c0-3 3-5 6-5s6 2 6 5" strokeWidth="2" strokeLinecap="round"/>
            </svg>

            <svg className={`h-4 w-4 text-emerald-700 transition-transform ${openMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-3 w-56 py-2 rounded-xl bg-white border border-emerald-100 shadow-xl animate-fadeIn">
              <button
                onClick={() => navigate("/restuarent")}
                className="block w-full text-left px-4 py-2.5 text-sm text-emerald-800 hover:bg-emerald-50 transition"
              >
                Profile Information
              </button>
              <button
                onClick={() => navigate("/reset-password")}
                className="block w-full text-left px-4 py-2.5 text-sm text-emerald-800 hover:bg-emerald-50 transition"
              >
                Reset Password
              </button>
              <div className="border-t border-emerald-100 my-1"></div>
              <button
                onClick={logout}
                className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
