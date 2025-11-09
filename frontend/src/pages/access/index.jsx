// frontend/src/pages/access/index.jsx
import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

export default function AccessManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openModal, setOpenModal] = useState(false); // create modal
  const [title, setTitle] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingId, setEditingId] = useState(null);

  // search (you already added earlier)
  const [search, setSearch] = useState("");

  async function loadPermissions() {
    try {
      setLoading(true);
      const res = await api.get("/permissions");
      setPermissions(Array.isArray(res?.data?.data) ? res.data.data : []);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPermissions(); }, []);

  async function handleCreate() {
    if (!title.trim()) { setError("Title is required"); return; }
    try {
      setSubmitting(true);
      await api.post("/permissions", { title: title.trim() });
      setTitle("");
      setOpenModal(false);
      await loadPermissions();
    } catch (e) {
      setError(e.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(p) {
    setEditingId(p.id);
    setEditTitle(p.title || "");
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editTitle.trim()) { setError("Title is required"); return; }
    try {
      setSubmitting(true);
      await api.put(`/permissions/${editingId}`, { title: editTitle.trim() });
      setEditOpen(false);
      setEditingId(null);
      setEditTitle("");
      await loadPermissions();
    } catch (e) {
      setError(e.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this permission?");
    if (!ok) return;
    try {
      await api.delete(`/permissions/${id}`);
      // optimistic update
      setPermissions(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      setError(e.message || "Failed to delete");
    }
  }

  const filtered = permissions.filter(p =>
    (p.title || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
           <h2 className="leading-tight font-extrabold">
            <span className="block text-xl md:text-2xl text-emerald-700">Permissions</span>
          </h2>

            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create Permission
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <select className="border rounded-md px-2 py-1.5 bg-white" defaultValue="10" aria-label="entries per page">
                  <option value="10">10</option><option value="25">25</option>
                  <option value="50">50</option><option value="100">100</option>
                </select>
                <span className="text-gray-600">entries per page</span>
              </div>

              <label className="text-sm text-gray-700 flex items-center gap-2">
                <span>Search:</span>
                <input
                  type="text"
                  className="border rounded-md px-2 py-1.5 w-56"
                  placeholder="Search title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-emerald-700 text-white">
                    <th className="px-4 py-2 text-left text-sm font-semibold w-20">SR No.</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Title</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold w-44">Created</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-600">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-600">
                      {search ? "No matches for your search" : "No records found"}
                    </td></tr>
                  ) : (
                    filtered.map((p, idx) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-4 py-2 text-sm">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm">{p.title}</td>
                        <td className="px-4 py-2 text-sm">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="px-3 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="px-3 py-1 rounded border border-red-600 text-red-700 hover:bg-red-50"
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

            <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
              <span>Showing {filtered.length ? 1 : 0} to {filtered.length} of {filtered.length} entries</span>
              <div className="inline-flex items-center gap-1">
                <button className="px-2.5 py-1.5 rounded border text-gray-400 cursor-not-allowed" disabled>«</button>
                <button className="px-2.5 py-1.5 rounded-full bg-green-700 text-white" disabled>1</button>
                <button className="px-2.5 py-1.5 rounded border text-gray-400 cursor-not-allowed" disabled>»</button>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </main>

        <footer className="mt-auto"><Footer /></footer>
      </div>

      {/* Create modal (unchanged) */}
      {openModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpenModal(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Add Permissions</h2>
                  <button onClick={() => setOpenModal(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100" aria-label="Close">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
              <div className="px-5 py-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-600">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="px-5 pb-5 flex justify-end gap-3">
                <button onClick={() => setOpenModal(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={submitting} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                  {submitting ? "Saving..." : "Add Permissions"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setEditOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Edit Permission</h2>
                  <button onClick={() => setEditOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100" aria-label="Close">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
              <div className="px-5 py-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-600">*</span></label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="px-5 pb-5 flex justify-end gap-3">
                <button onClick={() => setEditOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleEditSave} disabled={submitting} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
