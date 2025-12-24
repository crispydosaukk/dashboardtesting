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
      flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium tracking-wide
      transition-all duration-200 border border-transparent
      ${isActive
        ? "bg-emerald-600 text-white shadow-[0_6px_20px_rgba(16,185,129,0.12)] scale-[1.02]"
        : "text-emerald-800 hover:bg-emerald-50 hover:border-emerald-100"
      }
      `
    }
  >
    <span className="h-5 w-5 text-current">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
);

/* Dropdown (group) */
function Group({ label, icon, children, defaultOpen = false, hidden = false, openProp }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  if (hidden) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between px-3 py-2.5 rounded-lg
          text-[15px] font-semibold text-emerald-800 hover:bg-emerald-50
          border border-emerald-100 transition-all duration-200
        "
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 truncate">
          <span className="h-5 w-5 text-current">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <svg
          className={`h-4 w-4 text-emerald-600 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && <div className="pl-9 pr-2 py-1 space-y-1 animate-fadeIn">{children}</div>}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  useEffect(() => {
    if (open) onClose?.();
  }, [location.pathname]);

  const escHandler = useCallback(
    (e) => {
      if (e.key === "Escape" && open) onClose?.();
    },
    [open, onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [escHandler]);

  /* TOP LEVEL MENU (Category & Product removed here) */
  const rawMenu = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard", icon: iconDashboard(), perm: "dashboard" },
      { label: "Restaurant", to: "/restuarent", icon: iconRestaurant(), perm: "restaurant" },
      { label: "Customer Info", to: "/customerinfo", icon: iconCustomer(), perm: "customer_info" },
      { label: "Customer Details", to: "/customerdetails", icon: iconCustomerDetails(), perm: "customer_details" },
      { label: "Settings", to: "/settings", icon: iconSettings(), perm: "settings" },
      { label: "Order Management", to: "/orders", icon: iconOrders(), perm: "order_management" },
    ],
    []
  );


  /* NEW GROUP: MENU MANAGEMENT (Category + Product) */
  const rawMenuManagementChildren = useMemo(
    () => [
      { label: "Category", to: "/category", icon: iconCategory(), perm: "category" },
      { label: "Product", to: "/product", icon: iconProduct(), perm: "product" },
    ],
    []
  );

  /* ACCESS CONTROL (unchanged) */
  const rawAccessChildren = useMemo(
    () => [
      { label: "Permissions", to: "/access", icon: iconLock(), perm: "access" },
      { label: "Roles", to: "/access/roles", icon: iconUsersCog(), perm: "access" },
      { label: "Users", to: "/access/users", icon: iconUser(), perm: "access" },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [query]);

  const visibleMenu = useMemo(() => {
    const q = debouncedQuery;
    return rawMenu.filter((m) => {
      if (!can(m.perm)) return false;
      if (!q) return true;
      return m.label.toLowerCase().includes(q);
    });
  }, [rawMenu, debouncedQuery]);

  const filteredMenuManagement = useMemo(() => {
    const q = debouncedQuery;
    return rawMenuManagementChildren.filter((c) => {
      if (!can(c.perm)) return false;
      if (!q) return true;
      return c.label.toLowerCase().includes(q);
    });
  }, [rawMenuManagementChildren, debouncedQuery]);

  const filteredAccessChildren = useMemo(() => {
    const q = debouncedQuery;
    return rawAccessChildren.filter((c) => {
      if (!can(c.perm)) return false;
      if (!q) return true;
      return c.label.toLowerCase().includes(q);
    });
  }, [rawAccessChildren, debouncedQuery]);

  const accessMatchesGroupLabel =
    (debouncedQuery && "access control".includes(debouncedQuery)) ||
    (debouncedQuery && "access".includes(debouncedQuery));

  const showAccessGroup =
    filteredAccessChildren.length > 0 ||
    accessMatchesGroupLabel ||
    location.pathname.startsWith("/access");

  const accessAutoOpen = Boolean(
    debouncedQuery
      ? filteredAccessChildren.length > 0 || accessMatchesGroupLabel
      : location.pathname.startsWith("/access")
  );

  const [user] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const clearSearch = () => setQuery("");

  return (
    <>
      {/* small styles unchanged */}
      <style>{`
        .animate-fadeIn { animation: fadeIn 240ms ease both; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }
        input[type="search"]:focus { box-shadow: 0 0 0 1px rgba(16,185,129,0.4), 0 0 12px rgba(16,185,129,0.5); }
        input[type="search"]::placeholder { transition: opacity 0.4s ease; }
        input[type="search"]:focus::placeholder { opacity: 0.25; }
        .sidebar-scroll::-webkit-scrollbar { width: 8px; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(15, 118, 110, 0.12); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
      `}</style>

      {/* overlay + aside unchanged */}
      <div
        onClick={onClose}
        className={`fixed inset-0 top-16 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      />

      <aside
        className={`
          fixed left-0 top-16 bottom-0 z-40 w-72
          bg-white/95 backdrop-blur-xl
          border-r border-emerald-100 shadow-lg
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-4 border-b border-emerald-100">
          <div className="mt-3 relative">
            <label className="relative block">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="
                  w-full text-sm rounded-xl px-8 py-2.5
                  bg-white/40 backdrop-blur-md
                  border border-emerald-200/40
                  text-emerald-900 placeholder:text-emerald-600/50
                  shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]
                  focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400
                  transition-all
                "
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">⌕</span>
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </label>
          </div>
        </div>

        <nav className="p-4 space-y-3 overflow-y-auto h-[calc(100%-220px)] sidebar-scroll">
          {visibleMenu.length === 0 &&
            !filteredMenuManagement.length &&
            !filteredAccessChildren.length &&
            debouncedQuery && (
              <div className="text-xs text-slate-400 px-2">
                No results for “{debouncedQuery}”
              </div>
            )}

          {visibleMenu.map((m) => (
            <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
          ))}

          {/* NEW MENU MANAGEMENT GROUP INSERTED HERE */}
          <Group
            label="Menu Management"
            icon={iconCategory()}
            hidden={filteredMenuManagement.length === 0}
            openProp={
              location.pathname.startsWith("/category") ||
              location.pathname.startsWith("/product")
            }
          >
            {filteredMenuManagement.map((m) => (
              <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
            ))}
          </Group>

          {/* ACCESS CONTROL GROUP UNCHANGED */}
          <Group
            label="Access Control"
            icon={iconShield()}
            defaultOpen={accessAutoOpen}
            hidden={!showAccessGroup}
            openProp={accessAutoOpen}
          >
            {filteredAccessChildren.map((m) => (
              <Item key={m.label} to={m.to} label={m.label} icon={m.icon} />
            ))}
          </Group>
        </nav>

        {/* FOOTER UNCHANGED */}
        <div className="p-4 pt-3 border-t border-emerald-100 bg-gradient-to-t from-[#f6fffb] to-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-emerald-800 truncate">{user?.name || "Admin"}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email || "admin@crispy.dosa"}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold shadow-sm transition-all"
            >
              <span className="h-4 w-4">{iconLogout()}</span>
              Logout
            </button>

            <button
              onClick={() => {
                window.location.href = "/profile";
              }}
              className="w-12 h-10 rounded-lg border border-emerald-100 bg-white flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition"
              title="Profile"
            >
              {iconUser()}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* icons unchanged */
function iconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M3 12h8V4H3v8zm10 8h8v-6h-8v6zM3 20h8v-6H3v6zm10-8h8V4h-8v8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconRestaurant() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M6 3v9a2 2 0 0 0 4 0V3M6 8h4M14 3h2a3 3 0 0 1 3 3v15h-3v-7h-2V3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconCategory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M3 9h6V3H3v6zm12 0h6V3h-6v6zM3 21h6v-6H3v6zm12 0h6v-6h-6v6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function iconProduct() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function iconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconUsersCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 14a5 5 0 0 0-9 3v3M21 20v-1a4 4 0 0 0-6.5-3.1M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 7.5l1 .6-1 1.7h-2l-1-1.7 1-.6V6h2v1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function iconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconCustomer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zM3 21a9 9 0 0 1 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconOrders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M4 6h16v12H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function iconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 4.5l1.2 1.8a1 1 0 0 0 .8.4h2.1a1 1 0 0 1 .98 1.2l-.3 1.4a1 1 0 0 0 .26.9l1.5 1.5a1 1 0 0 1 0 1.4l-1.5 1.5a1 1 0 0 0-.26.9l.3 1.4a1 1 0 0 1-.98 1.2H14a1 1 0 0 0-.8.4L12 19.5a1 1 0 0 1-1.64 0L9.2 17.7a1 1 0 0 0-.8-.4H6.3a1 1 0 0 1-.98-1.2l.3-1.4a1 1 0 0 0-.26-.9L3.9 12a1 1 0 0 1 0-1.4l1.46-1.46a1 1 0 0 0 .26-.9l-.3-1.4A1 1 0 0 1 6.3 6.7h2.1a1 1 0 0 0 .8-.4L10.36 4.5a1 1 0 0 1 1.64 0z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function iconCustomerDetails() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M17 20h5v-2a3 3 0 0 0-5.3-1.5M16 3.13a4 4 0 0 1 0 7.75M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zM3 21a9 9 0 0 1 18 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
