import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

/* ---------- Small helper dropdown (multi-select) ---------- */
function MultiSelectDropdown({ loading, options, selected, onToggle, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const labelText = useMemo(() => {
    if (loading) return "Loading…";
    if (!options?.length) return "No options";
    if (!selected?.length) return placeholder;
    const picked = options.filter(o => selected.includes(o.id)).map(o => o.title);
    if (picked.length <= 3) return picked.join(", ");
    return `${picked.slice(0, 3).join(", ")} +${picked.length - 3} more`;
  }, [loading, options, selected, placeholder]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full border rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length ? "text-gray-900" : "text-gray-500"}>{labelText}</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-600">Loading…</div>
          ) : !options?.length ? (
            <div className="px-3 py-2 text-sm text-gray-600">No options found</div>
          ) : (
            <ul role="listbox" className="py-1">
              {options.map((opt) => {
                const checked = selected.includes(opt.id);
                return (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={checked}
                    className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                    onClick={() => onToggle(opt.id)}
                  >
                    <input type="checkbox" readOnly checked={checked} className="h-4 w-4 rounded border-gray-300" />
                    <span className="text-gray-800">{opt.title}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Table state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  // Roles
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roleOptions, setRoleOptions] = useState([]); // [{id,title}]

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRoleIds, setCRoleIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const canSave = cName.trim() && cEmail.trim() && cRoleIds.length > 0;

  // Edit modal (same fields as Add)
  const [openEdit, setOpenEdit] = useState(false);
  const [eId, setEId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");        // new password (blank keeps same)
  const [eRoleIds, setERoleIds] = useState([]);          // multi-select for parity with Add
  const [updating, setUpdating] = useState(false);
  const canUpdate = eId && eName.trim() && eEmail.trim() && eRoleIds.length > 0;

  // Load roles
  useEffect(() => {
    (async () => {
      try {
        setRolesLoading(true);
        const res = await api.get("/roles");
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRoleOptions(list.map(r => ({ id: r.id, title: r.title })));
        setRolesError("");
      } catch (e) {
        setRolesError(e?.message || "Failed to load roles");
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  // Load users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await api.get("/users");
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      // Expect each user: { id, name, email, role_id, role_title, has_password }
      setUsers(list);
      setUsersError("");
    } catch (e) {
      setUsersError(e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };
  useEffect(() => { fetchUsers(); }, []);

  // Search (name/email/role/has_password)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const role = (u.role_title || "").toLowerCase();
      const pwd = u.has_password ? "password set" : "no password";
      return (
        (u.name || "").toLowerCase().includes(needle) ||
        (u.email || "").toLowerCase().includes(needle) ||
        role.includes(needle) ||
        pwd.includes(needle)
      );
    });
  }, [q, users]);

  useEffect(() => setPage(1), [q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* ---------- Create ---------- */
  const handleCreate = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      const role_id = cRoleIds[0] || null; // DB has single FK; we use first selection
      await api.post("/users", { name: cName, email: cEmail, password: cPassword, role_id });
      setCName(""); setCEmail(""); setCPassword(""); setCRoleIds([]);
      setOpenCreate(false);
      await fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Open Edit with same fields as Add ---------- */
  const openEditFor = (u) => {
    setEId(u.id);
    setEName(u.name || "");
    setEEmail(u.email || "");
    setEPassword(""); // never show saved password; allow entering a new one
    setERoleIds(u.role_id ? [Number(u.role_id)] : []);
    setOpenEdit(true);
  };

  /* ---------- Update ---------- */
  const handleUpdate = async () => {
    if (!canUpdate) return;
    try {
      setUpdating(true);
      const role_id = eRoleIds[0] || null;
      const body = { name: eName, email: eEmail, role_id };
      if (ePassword.trim()) body.password = ePassword.trim(); // blank -> keep old
      await api.put(`/users/${eId}`, body);
      setOpenEdit(false);
      await fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      await fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="leading-tight font-extrabold">
              <span className="block text-xl md:text-2xl text-emerald-700">List of Users</span>
            </h2>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700/90 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Add User
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-sm border">
            {/* Top controls */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <select
                  className="border rounded-md px-2 py-1.5 bg-white"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="entries per page"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600">entries per page</span>
              </div>

              <label className="text-sm text-gray-700 flex items-center gap-2">
                <span>Search:</span>
                <input
                  type="text"
                  className="border rounded-md px-2 py-1.5 w-56"
                  placeholder="Search by name, email, role, password set…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-gray-200">
                <thead>
                  <tr className="bg-green-700 text-white">
                    <th className="px-4 py-2 text-left text-sm font-semibold w-20">SR No.</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Email</th>
                    {/* <th className="px-4 py-2 text-left text-sm font-semibold">Password</th> */}
                    <th className="px-4 py-2 text-left text-sm font-semibold">Roles</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold w-44">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-600">Loading users…</td></tr>
                  ) : usersError ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-red-600">{usersError}</td></tr>
                  ) : pageSlice.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-600">No records found</td></tr>
                  ) : (
                    pageSlice.map((u, idx) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-4 py-2 text-sm text-gray-700">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{u.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{u.email}</td>
                        {/* <td className="px-4 py-2 text-sm text-gray-700">
                          {u.has_password ? "••••••" : "—"}
                        </td> */}
                        <td className="px-4 py-2 text-sm text-gray-700">{u.role_title || "—"}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="inline-flex gap-2">
                            <button
                              className="px-3 py-1 rounded border hover:bg-gray-50"
                              onClick={() => openEditFor(u)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1 rounded border hover:bg-gray-50 text-red-600 border-red-300"
                              onClick={() => handleDelete(u)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
            <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {pageSlice.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
              </span>
              <div className="inline-flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2.5 py-1.5 rounded border" disabled={page === 1}>«</button>
                <button className="px-2.5 py-1.5 rounded-full bg-green-700 text-white" disabled>{page}</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2.5 py-1.5 rounded border" disabled={page >= totalPages}>»</button>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-auto">
          <Footer />
        </footer>
      </div>

      {/* -------- Create User Modal (placeholders + Cancel) -------- */}
      {openCreate && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpenCreate(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border">
              <div className="px-5 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
              </div>

              <div className="px-5 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-600">*</span></label>
                  <input type="text" value={cName} onChange={(e)=>setCName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Enter full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email<span className="text-red-600">*</span></label>
                  <input type="email" value={cEmail} onChange={(e)=>setCEmail(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="name@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={cPassword} onChange={(e)=>setCPassword(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Set an initial password (optional)" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Roles<span className="text-red-600">*</span></label>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setCRoleIds(roleOptions.map(r=>r.id))} className="px-2 py-1 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-600/90" disabled={rolesLoading || roleOptions.length===0}>Select all</button>
                      <button type="button" onClick={()=>setCRoleIds([])} className="px-2 py-1 text-xs font-medium rounded bg-teal-600/10 text-teal-700 border border-teal-300 hover:bg-teal-50" disabled={rolesLoading || cRoleIds.length===0}>Deselect all</button>
                    </div>
                  </div>
                  <MultiSelectDropdown loading={rolesLoading} options={roleOptions} selected={cRoleIds} onToggle={(id)=>setCRoleIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])} placeholder="Select role(s)" />
                  {rolesError && <p className="mt-2 text-sm text-red-600">{rolesError}</p>}
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button onClick={()=>setOpenCreate(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={!canSave || saving} className="inline-flex items-center justify-center rounded-md bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600/90 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -------- Edit User Modal (same fields as Add) -------- */}
      {openEdit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpenEdit(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border">
              <div className="px-5 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              </div>

              <div className="px-5 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-600">*</span></label>
                  <input type="text" value={eName} onChange={(e)=>setEName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Enter full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email<span className="text-red-600">*</span></label>
                  <input type="email" value={eEmail} onChange={(e)=>setEEmail(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="name@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={ePassword} onChange={(e)=>setEPassword(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Leave blank to keep current password" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Roles<span className="text-red-600">*</span></label>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setERoleIds(roleOptions.map(r=>r.id))} className="px-2 py-1 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-600/90" disabled={rolesLoading || roleOptions.length===0}>Select all</button>
                      <button type="button" onClick={()=>setERoleIds([])} className="px-2 py-1 text-xs font-medium rounded bg-teal-600/10 text-teal-700 border border-teal-300 hover:bg-teal-50" disabled={rolesLoading || eRoleIds.length===0}>Deselect all</button>
                    </div>
                  </div>
                  <MultiSelectDropdown loading={rolesLoading} options={roleOptions} selected={eRoleIds} onToggle={(id)=>setERoleIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])} placeholder="Select role(s)" />
                  {rolesError && <p className="mt-2 text-sm text-red-600">{rolesError}</p>}
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button onClick={()=>setOpenEdit(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={!canUpdate || updating} className="rounded-md bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-700/90 disabled:opacity-60">{updating ? "Saving..." : "Save changes"}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
