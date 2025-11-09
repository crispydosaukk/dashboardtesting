// src/pages/admin/Category.jsx
import React, { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

export default function Category() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    image: null,
    oldImage: "",
  });
  const [categories, setCategories] = useState([]);

  // --- Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Fetch all categories
  useEffect(() => {
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

  // Add / Update handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name?.trim();
    if (!nameTrim) {
      alert("Please enter a category name");
      return;
    }

    const localExists = categories.some(
      (c) => c.id !== form.id && c.name.trim().toLowerCase() === nameTrim.toLowerCase()
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
            c.id === Number(form.id)
              ? { ...c, name: updated.name, image: updated.image }
              : c
          )
        );
      }

      setShowModal(false);
      setForm({ id: null, name: "", image: null, oldImage: "" });
      setIsEdit(false);
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
      oldImage: item.image,
    });
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
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Something went wrong while deleting.");
    }
  };

  // Toggle category status
  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 1 ? 0 : 1;

    try {
      const res = await fetch(`${API}/category/${cat.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: cat.name, status: newStatus }),
      });

      if (!res.ok) {
        alert("Failed to update status");
        return;
      }

      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, status: newStatus } : c
        )
      );
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 font-jakarta">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-6 md:px-10 lg:px-12 py-10">
          {/* Page header */}
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="leading-tight font-extrabold">
                  <span className="block text-xl md:text-2xl text-emerald-700">Categories</span>
                </h2>
                <p className="mt-1 text-slate-600 max-w-xl">
                  Manage your product categories — add images, toggle availability, edit or delete.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search input */}
                <div className="relative">
                  <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                  </svg>
                  <input
                    placeholder="Search categories or ID..."
                    className="pl-10 pr-10 py-2 border rounded-lg shadow-sm w-64 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

                <button
                  onClick={() => {
                    setIsEdit(false);
                    setForm({ id: null, name: "", image: null, oldImage: "" });
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Category
                </button>
              </div>
            </div>

            {/* table card */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-black overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-lg font-medium text-slate-800">All Categories</h2>
                <div className="text-sm text-slate-500">{filteredCategories.length} total</div>
              </div>

              <div className="p-4">
                <div className="overflow-x-auto">
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
                          <tr key={item.id} className={`${item.status === 0 ? "bg-slate-50 opacity-80" : ""} hover:bg-slate-50 transition`}>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                                  {item.image ? (
                                    <img
                                      src={`${API.replace("/api", "")}/uploads/${item.image}`}
                                      alt={item.name}
                                      className={`h-full w-full object-cover ${item.status === 0 ? "grayscale blur-[0.6px]" : ""}`}
                                    />
                                  ) : (
                                    <div className="text-xs text-slate-400 px-2">No image</div>
                                  )}
                                </div>
                                <div className="hidden sm:block text-xs text-slate-500">
                                  <div className="text-sm font-medium text-slate-800">{item.name}</div>
                                  <div className="mt-1">ID: <span className="text-slate-400">{item.id}</span></div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-middle">
                              <div className="text-sm font-medium text-slate-800 sm:hidden">{item.name}</div>
                              <div className="hidden sm:block text-sm text-slate-700">{item.name}</div>
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
                              <div className="inline-flex items-center gap-3">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-emerald-600 hover:bg-emerald-50 shadow-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-red-600 hover:bg-red-50 shadow-sm"
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
              </div>
            </div>
          </div>
        </main>

        {/* Footer wrapper with mt-auto to keep it at the bottom when content is short */}
        <div className="mt-34">
          <Footer />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isEdit ? "Edit Category" : "Add Category"}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsEdit(false);
                  setForm({ id: null, name: "", image: null, oldImage: "" });
                }}
                className="p-2 rounded-md hover:bg-slate-100"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 011.06 0L10 7.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9l2.66 2.66a.75.75 0 11-1.06 1.06L10 10.12l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9 6.28 6.34a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g. Beverages"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Category Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({ ...form, image: e.target.files ? e.target.files[0] : null })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                {isEdit && form.oldImage && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={`${API.replace("/api", "")}/uploads/${form.oldImage}`}
                      className="h-16 w-16 rounded-lg object-cover border"
                      alt="preview"
                    />
                    <div className="text-sm text-slate-500">Current image</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setIsEdit(false);
                    setForm({ id: null, name: "", image: null, oldImage: "" });
                  }}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
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
