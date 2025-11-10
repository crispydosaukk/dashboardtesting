// src/pages/admin/Category.jsx
import React, { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion } from "framer-motion";
import { Pencil, Trash2, Power } from "lucide-react";

export default function Category() {
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    image: null, // File or null
    oldImage: "",
  });
  const [previewUrl, setPreviewUrl] = useState(""); // safe image preview url
  const [categories, setCategories] = useState([]);

  // --- Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Fetch all categories
  useEffect(() => {
    if (!API || !token) return;
    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching categories:", err));
  }, [API, token]);

  // debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // filtered list (memoized)
  const filteredCategories = useMemo(() => {
    if (!debouncedQuery) return categories;
    const q = debouncedQuery;
    return categories.filter((c) => {
      if (!c) return false;
      // match name
      if (c.name && c.name.toString().toLowerCase().includes(q)) return true;
      // match id
      if (String(c.id).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [categories, debouncedQuery]);

  // Manage previewUrl for selected new image (or clear when no new image)
  useEffect(() => {
    // If a new File is chosen, create preview; otherwise clear preview
    if (form.image instanceof File) {
      const url = URL.createObjectURL(form.image);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl("");
      };
    } else {
      // no new file - clear preview (but keep oldImage visible via API_BASE)
      setPreviewUrl("");
    }
  }, [form.image]);

  // Add / Update handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name?.trim();
    if (!nameTrim) {
      alert("Please enter a category name");
      return;
    }

    const localExists = categories.some(
      (c) => c.id !== form.id && c.name && c.name.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (localExists) {
      alert("Category name already exists");
      return;
    }

    const fd = new FormData();
    fd.append("name", nameTrim);
    if (form.image) fd.append("image", form.image);

    try {
      let res;
      if (!isEdit) {
        res = await fetch(`${API}/category`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Server error" }));
          if (res.status === 409) {
            alert(err.message || "Category name already exists");
            return;
          }
          alert(err.message || "Failed to add category");
          return;
        }

        const newData = await res.json();
        setCategories((prev) => [newData, ...prev]);
      } else {
        res = await fetch(`${API}/category/${form.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Server error" }));
          if (res.status === 409) {
            alert(err.message || "Category name already exists");
            return;
          }
          alert(err.message || "Failed to update category");
          return;
        }

        const updated = await res.json();
        setCategories((prev) =>
          prev.map((c) =>
            c.id === (typeof form.id === "string" ? Number(form.id) : form.id)
              ? { ...c, name: updated.name, image: updated.image, status: updated.status ?? c.status }
              : c
          )
        );
      }

      // close modal & reset
      setShowModal(false);
      setForm({ id: null, name: "", image: null, oldImage: "" });
      setIsEdit(false);
      setPreviewUrl("");
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Edit handler
  const handleEdit = (item) => {
    setIsEdit(true);
    setForm({
      id: item.id,
      name: item.name,
      image: null,
      oldImage: item.image || "",
    });
    setPreviewUrl("");
    setShowModal(true);
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`${API}/category/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Server error" }));
        alert(err.message || "Failed to delete category");
        return;
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, _removing: true } : c))
      );

      setTimeout(() => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }, 250);

    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Something went wrong while deleting.");
    }
  };

  // Toggle category status
  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 1 ? 0 : 1;

    // optimistic UI
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: newStatus } : c)));

    try {
      const res = await fetch(`${API}/category/${cat.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: cat.name, status: newStatus }),
      });

      if (!res.ok) {
        // revert on failure
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: cat.status } : c)));
        alert("Failed to update status");
        return;
      }

      // success: server may return updated object; update state if provided
      const updated = await res.json().catch(() => null);
      if (updated && updated.id) {
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: cat.status } : c)));
    }
  };

  // Mobile card for categories
  const CategoryCard = ({ item }) => {
  const imgUrl = item.image ? `${API_BASE}/uploads/${item.image}` : null;

  // Icons (side-by-side)
  const Actions = ({ className = "" }) => (
    <div className={`flex items-center gap-4 ${className}`}>
      <label className="inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.status === 1}
          onChange={() => handleToggleStatus(item)}
          className="sr-only peer"
          aria-label={`Toggle ${item.name} status`}
        />
        <div className="w-10 h-5 bg-slate-200 rounded-full relative peer-checked:bg-emerald-500 transition">
          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-5" />
        </div>
      </label>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => handleEdit(item)}
        className="text-emerald-600 p-1 rounded-md hover:bg-emerald-50"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil size={18} />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => handleToggleStatus(item)}
        className={item.status === 1 ? "text-emerald-600 p-1 rounded-md hover:bg-emerald-50" : "text-gray-400 p-1 rounded-md hover:bg-gray-100"}
        aria-label="Toggle Status"
        title={item.status === 1 ? "Deactivate" : "Activate"}
      >
        <Power size={18} />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={() => handleDelete(item.id)}
        className="text-red-600 p-1 rounded-md hover:bg-red-50"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 size={18} />
      </motion.button>
    </div>
  );

  return (
    <div className={`bg-white border rounded-xl p-3 sm:p-4 shadow-sm ${item.status === 0 ? "opacity-80" : ""}`}>
      {/* MOBILE layout: image + icons side-by-side; name below the image */}
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        {/* LEFT: image + icons (row) */}
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
            {imgUrl ? (
              <img src={imgUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="text-xs text-slate-400 px-2 text-center">No image</div>
            )}
          </div>

          {/* Icons beside image (mobile only) */}
          <div className="flex items-center md:hidden ml-10 mt-10">
            <Actions />
          </div>
        </div>

        {/* NAME + ID below image on mobile */}
        <div className="mt-2 md:hidden">
          <div className="text-sm font-semibold text-slate-800 break-words whitespace-normal">{item.name}</div>
          <div className="text-xs text-slate-500 mt-1">
            ID: <span className="text-slate-400">{item.id}</span>
          </div>
        </div>

        {/* DESKTOP layout content */}
        <div className="flex-1 min-w-0 hidden md:block">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800 break-words whitespace-normal">{item.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                ID: <span className="text-slate-400">{item.id}</span>
              </div>
            </div>

            {/* Desktop icons */}
            <div className="flex items-center gap-2 ml-0 md:ml-2">
              <Actions />
            </div>
          </div>

          {item?.description && (
            <div className="mt-2 text-xs text-slate-500 break-words whitespace-normal">{item.description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 font-jakarta">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {/* Page header */}
          <div className="max-w-7xl mx-auto">
            {/* <-- CHANGED: stack search first, add button below on mobile; keep side-by-side on desktop --> */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div>
                <h2 className="leading-tight font-extrabold">
                  <span className="block text-base sm:text-lg md:text-xl lg:text-2xl text-emerald-700">Categories</span>
                </h2>
                <p className="mt-1 text-slate-600 max-w-xl text-xs sm:text-sm">
                  Manage your product categories — add images, toggle availability, edit or delete.
                </p>
              </div>

              {/* REORDERABLE ROW: search first on mobile, add button second */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                {/* Search bar — appears first on mobile (w-full), desktop it becomes md:w-auto */}
                <div className="order-1 md:order-none w-full md:w-auto">
                  <div className="relative">
                    <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                    </svg>
                    <input
                      placeholder="Search categories or ID..."
                      className="pl-10 pr-10 py-2 border rounded-lg shadow-sm w-full md:w-64 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search categories"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setDebouncedQuery("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="clear search"
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Category — appears below search on mobile (order-2), side-by-side on desktop */}
                <div className="order-2 md:order-none w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIsEdit(false);
                      setForm({ id: null, name: "", image: null, oldImage: "" });
                      setPreviewUrl("");
                      setShowModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition text-sm w-full md:w-auto justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Category
                  </button>
                </div>
              </div>
            </div>

            {/* table / cards container */}
            <div className="mt-5 sm:mt-6">
              <div className="bg-white rounded-2xl shadow border overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                  <h3 className="text-sm font-medium text-slate-800">All Categories</h3>
                  <div className="text-sm text-slate-500">{filteredCategories.length} total</div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Image</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-100">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-slate-400">
                            {categories.length === 0 ? "No categories found" : "No categories match your search."}
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((item) => (
                          <tr
                            key={item.id}
                            className={`${item.status === 0 ? "bg-slate-50 opacity-80" : ""} hover:bg-slate-50 transition`}
                          >
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                                  {item.image ? (
                                    <img
                                      src={`${API_BASE}/uploads/${item.image}`}
                                      alt={item.name}
                                      className={`h-full w-full object-cover ${item.status === 0 ? "grayscale blur-[0.6px]" : ""}`}
                                    />
                                  ) : (
                                    <div className="text-xs text-slate-400 px-2">No image</div>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  <div className="text-sm font-medium text-slate-800 break-words whitespace-normal">{item.name}</div>
                                  <div className="mt-1">ID: <span className="text-slate-400">{item.id}</span></div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-middle">
                              <div className="text-sm text-slate-700 break-words whitespace-normal">{item.name}</div>
                            </td>

                            <td className="px-4 py-4 align-middle text-center">
                              <label className="inline-flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={item.status === 1}
                                  onChange={() => handleToggleStatus(item)}
                                  className="sr-only peer"
                                  aria-label={`Toggle ${item.name} status`}
                                />
                                <div className="w-12 h-7 rounded-full bg-slate-200 relative peer-checked:bg-emerald-500 transition">
                                  <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-5"></div>
                                </div>
                                <span className="ml-3 text-sm">{item.status === 1 ? "Active" : "Inactive"}</span>
                              </label>
                            </td>

                            <td className="px-4 py-4 align-middle text-center">
                            <div className="inline-flex items-center gap-4">

                              {/* Edit */}
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleEdit(item)}
                                className="text-emerald-600"
                                aria-label="Edit"
                              >
                                <Pencil size={18} />
                              </motion.button>

                              {/* Toggle Status */}
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleToggleStatus(item)}
                                className={item.status === 1 ? "text-emerald-600" : "text-gray-400"}
                                aria-label="Toggle Status"
                              >
                                <Power size={18} />
                              </motion.button>

                              {/* Delete (animated removal) */}
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600"
                                aria-label="Delete"
                              >
                                <Trash2 size={18} />
                              </motion.button>

                            </div>
                          </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-3 sm:p-4 space-y-3">
                  {filteredCategories.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">{categories.length === 0 ? "No categories found" : "No categories match your search."}</div>
                  ) : (
                    filteredCategories.map((item) => <CategoryCard key={item.id} item={item} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer wrapper */}
        <div className="mt-0 sm:mt-22">
          <Footer />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setIsEdit(false);
              setForm({ id: null, name: "", image: null, oldImage: "" });
              setPreviewUrl("");
            }}
            aria-hidden="true"
          />

          <div className="relative w-full sm:w-[min(720px,95%)] bg-white rounded-t-xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isEdit ? "Edit Category" : "Add Category"}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsEdit(false);
                  setForm({ id: null, name: "", image: null, oldImage: "" });
                  setPreviewUrl("");
                }}
                className="p-2 rounded-md hover:bg-slate-100"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 011.06 0L10 7.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9l2.66 2.66a.75.75 0 11-1.06 1.06L10 10.12l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9 6.28 6.34a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-auto max-h-[75vh]">
              <div>
                <label className="block text-sm font-medium text-slate-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                  placeholder="e.g. Beverages"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Category Image</label>

                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-md px-3 py-2 text-sm">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v-6m0 0l-2 2m2-2 2 2" />
                    </svg>
                    <span className="text-sm text-slate-600">Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        setForm((prev) => ({ ...prev, image: file }));
                      }}
                    />
                  </label>

                  {(previewUrl && form.image instanceof File) || form.oldImage ? (
                    <div className="flex items-center gap-3">
                      {previewUrl && form.image instanceof File ? (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="h-16 w-16 rounded-lg object-cover border"
                        />
                      ) : form.oldImage ? (
                        <img
                          src={`${API_BASE}/uploads/${form.oldImage}`}
                          alt="current"
                          className="h-16 w-16 rounded-lg object-cover border"
                        />
                      ) : null}
                      <div className="text-sm text-slate-500">
                        {previewUrl && form.image instanceof File ? "New image ready to upload" : "Current image"}
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400 border">No image</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setIsEdit(false);
                    setForm({ id: null, name: "", image: null, oldImage: "" });
                    setPreviewUrl("");
                  }}
                  className="px-4 py-2 rounded-lg border text-sm w-full sm:w-auto text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm w-full sm:w-auto"
                >
                  {isEdit ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
