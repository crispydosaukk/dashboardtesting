import React, { useEffect, useMemo, useCallback, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { can } from "../../utils/perm";

/* Sidebar link item */
const Item = ({ to = "#", icon, label }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium tracking-wide
      transition-all duration-200 border border-transparent
      ${
        isActive
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]"
          : "text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300"
      }
      `
    }
  >
    <span className="h-5 w-5 text-current">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

/* Dropdown */
function Group({ label, icon, children, defaultOpen = false, hidden = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (hidden) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="
          w-full flex items-center justify-between px-3 py-2.5 rounded-xl
          text-[15px] font-semibold text-emerald-800 hover:bg-emerald-100
          border border-emerald-200 transition-all duration-200
        "
      >
        <span className="flex items-center gap-3">
          <span className="h-5 w-5 text-current">{icon}</span>
          {label}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && (
        <div className="pl-9 pr-2 py-1 space-y-1 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  useEffect(() => { if (open) onClose?.(); }, [location.pathname]); 
  const escHandler = useCallback(e => { if (e.key === "Escape" && open) onClose?.(); }, [open, onClose]);
  useEffect(() => { document.addEventListener("keydown", escHandler); return () => document.removeEventListener("keydown", escHandler); }, [escHandler]);

  const rawMenu = useMemo(() => [
    { label: "Dashboard", to: "/dashboard", icon: iconDashboard(), perm: "dashboard" },
    { label: "Manual Order Assign", to: "/manual-orders", icon: iconAssign(), perm: "order_management" },
    { label: "Restaurant", to: "/restuarent", icon: iconRestaurant(), perm: "restaurant" },
    { label: "Category", to: "/category", icon: iconCategory(), perm: "category" },
    { label: "Product", to: "/product", icon: iconProduct(), perm: "product" },
  ], []);

  const visibleMenu = rawMenu.filter(m => can(m.perm));

  const accessChildren = useMemo(() => [
    { label: "Permissions", to: "/access", icon: iconLock(), perm: "access" },
    { label: "Roles", to: "/access/roles", icon: iconUsersCog(), perm: "access" },
    { label: "Users", to: "/access/users", icon: iconUser(), perm: "access" },
  ].filter(x => can(x.perm)), []);

  const accessOpen = location.pathname.startsWith("/access");

  return (
    <>
      {/* Mobile Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 top-16 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      <aside
        className={`
          fixed left-0 top-16 bottom-0 z-40 w-72
          bg-white/90 backdrop-blur-xl
          border-r border-emerald-200 shadow-2xl
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <nav className="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]">
          {visibleMenu.map(m => (
            <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
          ))}

          <Group
            label="Access Control"
            icon={iconShield()}
            defaultOpen={accessOpen}
            hidden={accessChildren.length === 0}
          >
            {accessChildren.map(m => (
              <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
            ))}
          </Group>
        </nav>

        <div className="p-4 border-t border-emerald-200">
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold shadow-md transition-all"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* Icons */
function iconDashboard(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h8V4H3v8zm10 8h8v-6h-8v6zM3 20h8v-6H3v6zm10-8h8V4h-8v8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function iconAssign(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h10v6H4zM4 15h16v4H4zM16 5h4v6h-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>)}
function iconRestaurant(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M6 3v9a2 2 0 0 0 4 0V3M6 8h4M14 3h2a3 3 0 0 1 3 3v15h-3v-7h-2V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function iconCategory(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M3 9h6V3H3v6zm12 0h6V3h-6v6zM3 21h6v-6H3v6zm12 0h6v-6h-6v6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>)}
function iconProduct(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>)}
function iconShield(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function iconLock(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function iconUsersCog(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M12 14a5 5 0 0 0-9 3v3M21 20v-1a4 4 0 0 0-6.5-3.1M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="2"/><path d="M18.5 7.5l1 .6-1 1.7h-2l-1-1.7 1-.6V6h2v1.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function iconUser(){return(<svg viewBox="0 0 24 24" fill="none"><path d="M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
