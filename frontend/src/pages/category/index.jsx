// src/pages/admin/Category.jsx
import React, { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { motion } from "framer-motion";
import { Pencil, Trash2, Power, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
    image: null,
    oldImage: "",
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [categories, setCategories] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // =============================
  // FETCH ALL CATEGORIES (SORT SAFE)
  // =============================
  useEffect(() => {
    if (!API || !token) return;

    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) =>
        setCategories(
          Array.isArray(data)
            ? [...data].sort((a, b) => a.sort_order - b.sort_order)
            : []
        )
      )
      .catch((err) => console.error("Error fetching categories:", err));
  }, [API, token]);

  // =============================
  // SEARCH DEBOUNCE
  // =============================
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(searchQuery.trim().toLowerCase()),
      300
    );
    return () => clearTimeout(t);
  }, [searchQuery]);

  // =============================
  // FILTERED LIST
  // =============================
  const filteredCategories = useMemo(() => {
    if (!debouncedQuery) return categories;
    const q = debouncedQuery;

    return categories.filter((c) => {
      if (!c) return false;
      if (c.name?.toLowerCase().includes(q)) return true;
      if (String(c.id).includes(q)) return true;
      return false;
    });
  }, [categories, debouncedQuery]);

  // =============================
  // IMAGE PREVIEW
  // =============================
  useEffect(() => {
    if (form.image instanceof File) {
      const url = URL.createObjectURL(form.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
  }, [form.image]);

  // =============================
  // SAVE / UPDATE CATEGORY
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name.trim();
    if (!nameTrim) return alert("Please enter a category name");

    const exists = categories.some(
      (c) =>
        c.id !== form.id &&
        c.name.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (exists) return alert("Category name already exists");

    const fd = new FormData();
    fd.append("name", nameTrim);
    if (form.image) fd.append("image", form.image);

    try {
      let res;

      if (!isEdit) {
        // CREATE
        res = await fetch(`${API}/category`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const newData = await res.json();

        setCategories((prev) =>
          [...prev, newData].sort((a, b) => a.sort_order - b.sort_order)
        );
      } else {
        // UPDATE
        res = await fetch(`${API}/category/${form.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const updated = await res.json();

        setCategories((prev) =>
          prev
            .map((c) =>
              c.id === form.id
                ? { ...c, ...updated } // includes sort_order
                : c
            )
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      }

      // RESET
      setShowModal(false);
      setIsEdit(false);
      setForm({ id: null, name: "", image: null, oldImage: "" });
      setPreviewUrl("");
    } catch (err) {
      console.error("Save error:", err);
      alert("Something went wrong.");
    }
  };

  // =============================
  // EDIT CATEGORY
  // =============================
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

  // =============================
  // DELETE CATEGORY
  // =============================
  const handleDelete = async (id) => {
    if (!confirm("Delete category?")) return;

    try {
      await fetch(`${API}/category/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // =============================
  // STATUS TOGGLE
  // =============================
  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 1 ? 0 : 1;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id ? { ...c, status: newStatus } : c
      )
    );

    try {
      await fetch(`${API}/category/${cat.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cat.name, status: newStatus }),
      });
    } catch (err) {
      console.error("Status update failed");
    }
  };

  // =============================
  // DRAG & DROP SAVE ORDER
  // =============================
  const saveOrder = async (newList) => {
  const payload = newList.map((item, index) => ({
    id: item.id,
    sort_order: index + 1,
  }));

  try {
    await fetch(`${API}/category/reorder`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order: payload }),
    });

    // 🔥 IMPORTANT: RELOAD FROM SERVER
    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) =>
        setCategories(
          [...data].sort((a, b) => a.sort_order - b.sort_order)
        )
      );

  } catch (err) {
    console.error("Reorder save failed:", err);
  }
};

  // =============================
  // DRAG END FUNCTION
  // =============================
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Assign new sort_order
    const updated = items.map((cat, index) => ({
      ...cat,
      sort_order: index + 1,
    }));

    setCategories(updated);
    saveOrder(updated);
  };
  // =============================
  // MOBILE CATEGORY CARD
  // =============================
  const CategoryCard = ({ item }) => {
    const imgUrl = item.image ? `${API_BASE}/uploads/${item.image}` : null;

    return (
      <div
        className={`bg-white border rounded-xl p-3 shadow-sm ${
          item.status === 0 ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          {/* IMAGE */}
          <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-xs text-slate-400 p-2 text-center">
                No image
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex-1">
            <div className="text-sm font-semibold">{item.name}</div>
            <div className="text-xs text-slate-500">ID: {item.id}</div>

            {/* ACTIONS */}
            <div className="flex items-center gap-4 mt-3">
              {/* TOGGLE */}
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.status === 1}
                  onChange={() => handleToggleStatus(item)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-emerald-500 relative transition">
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transform transition peer-checked:translate-x-5" />
                </div>
              </label>

              {/* EDIT */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleEdit(item)}
                className="text-emerald-600"
              >
                <Pencil size={18} />
              </motion.button>

              {/* DELETE */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDelete(item.id)}
                className="text-red-600"
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =============================
  // RETURN JSX (FULL UI)
  // =============================
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 font-jakarta">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-emerald-700 text-xl">
                  Categories
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg">
                  Manage categories — drag to reorder, toggle visibility, edit or delete.
                </p>
              </div>

              {/* SEARCH + ADD */}
              <div className="flex flex-col md:flex-row gap-3">
                {/* SEARCH */}
                <div className="relative">
                  <input
                    className="pl-9 pr-10 py-2 border rounded-lg shadow-sm w-full md:w-64 text-sm focus:ring-emerald-500"
                    placeholder="Search category or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg
                    className="absolute left-3 top-3 w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                    />
                  </svg>

                  {searchQuery !== "" && (
                    <button
                      className="absolute right-2 top-2.5 text-slate-400"
                      onClick={() => setSearchQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* ADD BUTTON */}
                <button
                  onClick={() => {
                    setIsEdit(false);
                    setForm({ id: null, name: "", image: null, oldImage: "" });
                    setShowModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm shadow"
                >
                  + Add Category
                </button>
              </div>
            </div>

            {/* ===========================
                CATEGORY LIST WRAPPER
            ============================ */}
            <div className="mt-6 bg-white border rounded-2xl shadow overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between">
                <h3 className="text-sm font-medium">All Categories</h3>
                <span className="text-sm text-slate-500">
                  {filteredCategories.length} total
                </span>
              </div>

              {/* DESKTOP TABLE WITH DRAG-DROP */}
              <div className="hidden md:block p-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 w-10"></th>
                      <th className="px-4 text-left">Image</th>
                      <th className="px-4 text-left">Name</th>
                      <th className="px-4 text-center">Status</th>
                      <th className="px-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="categoryTable">
                      {(provided) => (
                        <tbody
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="divide-y divide-slate-100"
                        >
                          {filteredCategories.map((item, index) => (
                            <Draggable
                              key={item.id}
                              draggableId={String(item.id)}
                              index={index}
                            >
                              {(dragProvided) => (
                                <tr
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`${
                                    item.status === 0 ? "opacity-70" : ""
                                  } hover:bg-slate-50`}
                                >
                                  {/* DRAG HANDLE */}
                                  <td
                                    {...dragProvided.dragHandleProps}
                                    className="px-4 cursor-grab text-slate-400"
                                  >
                                    <GripVertical size={18} />
                                  </td>

                                  {/* IMAGE */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100">
                                        {item.image ? (
                                          <img
                                            src={`${API_BASE}/uploads/${item.image}`}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="p-3 text-xs text-slate-400">
                                            No image
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs">
                                        <div className="font-medium">
                                          {item.name}
                                        </div>
                                        <div className="text-slate-500">
                                          ID: {item.id}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* NAME */}
                                  <td className="px-4">{item.name}</td>

                                  {/* STATUS SWITCH */}
                                  <td className="px-4 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.status === 1}
                                        onChange={() => handleToggleStatus(item)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-12 h-6 rounded-full bg-slate-200 peer-checked:bg-emerald-500 relative">
                                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-6" />
                                      </div>
                                    </label>
                                  </td>

                                  {/* ACTION BUTTONS */}
                                  <td className="px-4 text-center">
                                    <div className="flex items-center gap-4 justify-center">
                                      <button
                                        onClick={() => handleEdit(item)}
                                        className="text-emerald-600"
                                      >
                                        <Pencil size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}
                        </tbody>
                      )}
                    </Droppable>
                  </DragDropContext>
                </table>
              </div>

              {/* MOBILE VIEW */}
              <div className="md:hidden p-4 space-y-3">
                {filteredCategories.map((item) => (
                  <CategoryCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* ==========================
          ADD / EDIT MODAL
      ========================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowModal(false);
              setIsEdit(false);
              setForm({ id: null, name: "", image: null, oldImage: "" });
            }}
          />

          <div className="relative w-full sm:w-[600px] bg-white rounded-t-xl sm:rounded-2xl shadow-xl p-5">
            <h3 className="font-semibold text-lg mb-4">
              {isEdit ? "Edit Category" : "Add Category"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NAME */}
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  className="mt-2 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* IMAGE */}
              <div>
                <label className="text-sm font-medium">Image</label>
                <input
                  type="file"
                  className="mt-2"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      image: e.target.files ? e.target.files[0] : null,
                    })
                  }
                />

                {/* Preview */}
                <div className="mt-2">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  ) : form.oldImage ? (
                    <img
                      src={`${API_BASE}/uploads/${form.oldImage}`}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-xs text-slate-400">No image</div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
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
