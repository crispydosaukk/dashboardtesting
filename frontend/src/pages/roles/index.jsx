import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

export default function Roles() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [roleTitle, setRoleTitle] = useState("");

  // Edit modal (NEW)
  const [openEdit, setOpenEdit] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSelectedIds, setEditSelectedIds] = useState([]);

  // Permissions
  const [permLoading, setPermLoading] = useState(true);
  const [permError, setPermError] = useState("");
  const [permissions, setPermissions] = useState([]);

  // Selected permissions for CREATE
  const [selectedIds, setSelectedIds] = useState([]);

  // Roles list
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [roles, setRoles] = useState([]);

  // Search (NEW)
  const [searchTerm, setSearchTerm] = useState("");

  // pagination placeholders (static UI)
  const pageSize = 10;

  // ---------- Load permissions ----------
  useEffect(() => {
    (async () => {
      try {
        setPermLoading(true);
        const res = await api.get("/permissions");
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setPermissions(list);
        setPermError("");
      } catch (e) {
        setPermError(e?.message || "Failed to load permissions");
      } finally {
        setPermLoading(false);
      }
    })();
  }, []);

  // ---------- Load roles ----------
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await api.get("/roles");
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setRoles(list);
      setRolesError("");
    } catch (e) {
      setRolesError(e?.message || "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Helpers for multi-select (CREATE)
  const allIds = useMemo(() => permissions.map((p) => p.id), [permissions]);
  const handleSelectAll = () => setSelectedIds(allIds);
  const handleDeselectAll = () => setSelectedIds([]);
  const toggleOne = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Helpers for multi-select (EDIT)
  const editAllIds = useMemo(() => permissions.map((p) => p.id), [permissions]);
  const editHandleSelectAll = () => setEditSelectedIds(editAllIds);
  const editHandleDeselectAll = () => setEditSelectedIds([]);
  const editToggleOne = (id) =>
    setEditSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Create submit
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = roleTitle.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const permission_ids = selectedIds.map(Number).filter(Boolean);
      await api.post("/roles", {
        title: roleTitle.trim(),
        permission_ids,
      });
      await fetchRoles();
      // reset + close
      setRoleTitle("");
      setSelectedIds([]);
      setOpenCreate(false);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit: open modal with preload
  const onEdit = (role) => {
    setEditRole(role);
    setEditTitle(role?.title || "");
    const pre = (role?.permissions || []).map((p) => p.id);
    setEditSelectedIds(pre);
    setOpenEdit(true);
  };

  // Edit submit
  const [updating, setUpdating] = useState(false);
  const canUpdate = editRole && editTitle.trim().length > 0;

  const handleUpdate = async () => {
    if (!canUpdate) return;
    try {
      setUpdating(true);
      const permission_ids = editSelectedIds.map(Number).filter(Boolean);
      await api.put(`/roles/${editRole.id}`, {
        title: editTitle.trim(),
        permission_ids,
      });
      await fetchRoles();
      // close
      setOpenEdit(false);
      setEditRole(null);
      setEditTitle("");
      setEditSelectedIds([]);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  // Delete
  const [deletingId, setDeletingId] = useState(null);
  const handleDelete = async (role) => {
    if (!role?.id) return;
    const ok = window.confirm(`Delete role "${role.title}"?`);
    if (!ok) return;
    try {
      setDeletingId(role.id);
      await api.delete(`/roles/${role.id}`);
      await fetchRoles();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete role");
    } finally {
      setDeletingId(null);
    }
  };

  // Search filter
  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const inTitle = String(r.title || "").toLowerCase().includes(q);
      const inPerms = (r.permissions || []).some((p) =>
        String(p.title || "").toLowerCase().includes(q)
      );
      return inTitle || inPerms;
    });
  }, [roles, searchTerm]);

  const renderPermissionsInline = (permArr = []) => {
  if (!permArr.length) return <span className="text-gray-500">—</span>;
  return permArr.map((p) => p.title).join(", ");
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
              <span className="block text-xl md:text-2xl text-emerald-700">List of Roles</span>
            </h2>

            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700/90 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Add Role
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-sm">
            {/* Top controls */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <select
                  className="border rounded-md px-2 py-1.5 bg-white"
                  defaultValue="10"
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
                  placeholder="Search by role or permission…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-gray-200">
                <thead>
                  <tr className="bg-green-700 text-white">
                    <th className="px-4 py-2 text-left text-sm font-semibold w-20">
                      SR No.
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Permissions
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rolesLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-600">
                        Loading roles…
                      </td>
                    </tr>
                  ) : rolesError ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                        {rolesError}
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.slice(0, pageSize).map((r, idx) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{r.title}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {renderPermissionsInline(r.permissions)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="inline-flex gap-2">
                            <button
                              className="px-3 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => onEdit(r)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1 rounded border border-red-600 text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(r)}
                              disabled={deletingId === r.id}
                            >
                              {deletingId === r.id ? "Deleting…" : "Delete"}
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
                Showing {filteredRoles.length ? 1 : 0} to {Math.min(pageSize, filteredRoles.length)} of {filteredRoles.length} entries
              </span>
              <div className="inline-flex items-center gap-1">
                <button className="px-2.5 py-1.5 rounded border text-gray-400 cursor-not-allowed" disabled>
                  «
                </button>
                <button className="px-2.5 py-1.5 rounded-full bg-green-700 text-white" disabled>
                  1
                </button>
                <button className="px-2.5 py-1.5 rounded border text-gray-400 cursor-not-allowed" disabled>
                  »
                </button>
              </div>
            </div>
          </div>

          {permError && <p className="mt-3 text-sm text-red-600">{permError}</p>}
        </main>

        <footer className="mt-auto">
          <Footer />
        </footer>
      </div>

      {/* CREATE MODAL */}
      {openCreate && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setOpenCreate(false)}
            aria-hidden="true"
          />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border">
              {/* Header */}
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Add Roles</h2>
                  <button
                    onClick={() => setOpenCreate(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Admin"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Permissions
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2 py-1 text-xs font-medium rounded bg-green-700 text-white hover:bg-green-700/90"
                        disabled={permLoading || permissions.length === 0}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50"
                        disabled={permLoading || selectedIds.length === 0}
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  <MultiSelectDropdown
                    loading={permLoading}
                    options={permissions}
                    selected={selectedIds}
                    onToggle={toggleOne}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex justify-end gap-3">
                <button
                  onClick={() => setOpenCreate(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!roleTitle.trim() || submitting}
                  className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-700/90 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL (NEW) */}
      {openEdit && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setOpenEdit(false)}
            aria-hidden="true"
          />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border">
              {/* Header */}
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Edit Role</h2>
                  <button
                    onClick={() => setOpenEdit(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Admin"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Permissions
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={editHandleSelectAll}
                        className="px-2 py-1 text-xs font-medium rounded bg-green-700 text-white hover:bg-green-700/90"
                        disabled={permLoading || permissions.length === 0}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={editHandleDeselectAll}
                        className="px-2 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50"
                        disabled={permLoading || editSelectedIds.length === 0}
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  <MultiSelectDropdown
                    loading={permLoading}
                    options={permissions}
                    selected={editSelectedIds}
                    onToggle={editToggleOne}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex justify-end gap-3">
                <button
                  onClick={() => setOpenEdit(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!editTitle.trim() || updating}
                  className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-700/90 disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiSelectDropdown({ loading, options, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const labelText = useMemo(() => {
    if (loading) return "Loading permissions…";
    if (!options?.length) return "No permissions available";
    if (!selected?.length) return "Select permissions";
    const picked = options
      .filter((o) => selected.includes(o.id))
      .map((o) => o.title);
    if (picked.length <= 3) return picked.join(", ");
    return `${picked.slice(0, 3).join(", ")} +${picked.length - 3} more`;
  }, [loading, options, selected]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length ? "text-gray-900" : "text-gray-500"}>
          {labelText}
        </span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-600">Loading…</div>
          ) : !options?.length ? (
            <div className="px-3 py-2 text-sm text-gray-600">No permissions found</div>
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
                    <input
                      type="checkbox"
                      readOnly
                      checked={checked}
                      className="h-4 w-4 rounded border-gray-300"
                    />
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
