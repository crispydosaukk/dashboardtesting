import React, { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

export default function Category() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ name: "", image: null });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/category`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCategories(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("image", form.image);

    const res = await fetch(`${API}/category`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const newCat = await res.json();
    setCategories([newCat, ...categories]);
    setShowModal(false);
    setForm({ name: "", image: null });
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/category/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setCategories(categories.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Category
            </h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Add Category
            </button>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border">
            {categories.length === 0 ? (
              <p className="text-gray-800 text-base">No categories yet.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-sm border-b">
                    <th className="py-2">Image</th>
                    <th className="py-2">Category Name</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((item) => (
                    <tr key={item.id} className="border-b text-sm">
                      <td className="py-2">
                        {item.category_image && (
                          <img
                            src={`${API.replace("/api", "")}/uploads/${item.category_image}`}
                            alt=""
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        )}
                      </td>
                      <td className="py-2 font-medium">{item.category_name}</td>
                      <td className="py-2 flex gap-2">
                        <button className="text-green-600 hover:underline">
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        <footer className="mt-auto">
          <Footer />
        </footer>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add Category</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category Image</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) =>
                    setForm({ ...form, image: e.target.files[0] })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
