import { useState, useEffect } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

export default function ProductPage() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    cat_id: "",
    image: null,
  });

  useEffect(() => {
    fetch(`${API}/category`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCategories);

    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData();

  fd.append("name", form.name);
  fd.append("description", form.description);
  fd.append("price", form.price);
  fd.append("discountPrice", form.discountPrice);
  fd.append("cat_id", form.cat_id);
  if (form.image instanceof File) fd.append("image", form.image);

  const method = form.id ? "PUT" : "POST";
  const url = form.id ? `${API}/products/${form.id}` : `${API}/products`;

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const saved = await res.json();

  if (form.id) {
    setProducts(products.map((p) => (p.id === form.id ? saved : p)));
  } else {
    setProducts([saved, ...products]);
  }

  setShowModal(false);
  setForm({ name: "", description: "", price: "", discountPrice: "", cat_id: "", image: null });
};


  const handleDelete = async (id) => {
    await fetch(`${API}/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setProducts(products.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 lg:px-6 py-6">

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Product Management</h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm"
            >
              + Add Product
            </button>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
            {products.length === 0 ? (
              <p className="text-gray-600 text-base py-4 text-center">No products added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b text-gray-700">
                      <th className="py-3 px-4 text-left">Image</th>
                      <th className="py-3 px-4 text-left">Name</th>
                      <th className="py-3 px-4 text-left">Price</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {products.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <img
                            src={`${API}/uploads/${p.image}`}
                            className="h-12 w-12 rounded-md object-cover border"
                          />
                        </td>

                        <td className="py-3 px-4 font-medium">{p.name}</td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">₹{p.price}</span>
                            <span className="text-sm text-gray-500 line-through">₹{p.discountPrice}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {categories.find((c) => c.id == p.cat_id)?.name}
                        </td>

                        <td className="py-3 px-4 flex gap-3">
                          <button
                            onClick={() => {
                              setForm(p);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Product</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <textarea
                placeholder="Description"
                required
                className="w-full border rounded-lg px-3 py-2"
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />

                <input
                  type="number"
                  placeholder="Discount Price"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.discountPrice}
                  onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                />
              </div>

              <select
                required
                className="w-full border rounded-lg px-3 py-2"
                value={form.cat_id}
                onChange={(e) => setForm({ ...form, cat_id: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input
                type="file"
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                  Cancel
                </button>

                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
