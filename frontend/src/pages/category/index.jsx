import React, { useState, useEffect } from "react";
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

  // Fetch all categories
  useEffect(() => {
    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, [API, token]);

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
        setCategories([newData, ...categories]);
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
        setCategories(
          categories.map((c) =>
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
      setCategories(categories.filter((c) => c.id !== id));
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

      setCategories(
        categories.map((c) =>
          c.id === cat.id ? { ...c, status: newStatus } : c
        )
      );
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-8 py-8 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Category</h1>
            <button
              onClick={() => {
                setIsEdit(false);
                setForm({ id: null, name: "", image: null, oldImage: "" });
                setShowModal(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Add Category
            </button>
          </div>

          <div className="bg-white p-6 shadow-sm border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="py-3 font-medium">Image</th>
                  <th className="py-3 font-medium">Name</th>
                  <th className="py-3 font-medium text-center">Status</th>
                  <th className="py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500">
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b transition ${
                        item.status === 0 ? "opacity-60 bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-3">
                        <div className="relative h-12 w-12">
                          {item.image && (
                            <img
                              src={`${API.replace("/api", "")}/uploads/${item.image}`}
                              className={`h-12 w-12 rounded-lg object-cover shadow-sm transition ${
                                item.status === 0 ? "grayscale blur-[1px]" : ""
                              }`}
                              alt="category"
                            />
                          )}
                          {item.status === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="w-[2px] h-10 bg-red-500 rotate-45"></span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 font-medium text-gray-800">{item.name}</td>

                      <td className="py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.status === 1}
                            onChange={() => handleToggleStatus(item)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                        </label>
                      </td>

                      <td className="py-3 text-center">
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
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
        </main>

        <Footer />
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-5 shadow-lg">
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit Category" : "Add Category"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Category Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full border px-3 py-2 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Category Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({ ...form, image: e.target.files[0] })
                  }
                  className="mt-1 w-full border px-3 py-2 rounded-lg"
                />
                {isEdit && form.oldImage && (
                  <img
                    src={`${API.replace("/api", "")}/uploads/${form.oldImage}`}
                    className="h-16 w-16 rounded-lg object-cover mt-2 border"
                    alt="preview"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setIsEdit(false);
                    setForm({ id: null, name: "", image: null, oldImage: "" });
                  }}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
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
