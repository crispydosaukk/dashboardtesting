import React, { useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";

export default function Product() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    image: null,
    description: "",
    price: "",
    discountPrice: "",
  });

  const [products, setProducts] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setProducts([...products, { ...form, id: Date.now() }]);
    setForm({ name: "", image: null, description: "", price: "", discountPrice: "" });
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setProducts(products.filter(item => item.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header onToggleSidebar={() => setSidebarOpen(s => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-6">

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Product Management</h1>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition"
            >
              + Add Product
            </button>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
            {products.length === 0 ? (
              <p className="text-gray-600 text-base py-4 text-center">
                No products added yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b text-gray-700">
                      <th className="py-3 px-4 text-left">Image</th>
                      <th className="py-3 px-4 text-left">Product Name</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-left">Price</th>
                      <th className="py-3 px-4 text-left">Discount Price</th>
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {products.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          {item.image && (
                            <img
                              src={URL.createObjectURL(item.image)}
                              className="h-12 w-12 rounded-md object-cover border"
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{item.name}</td>
                        <td className="py-3 px-4 max-w-xs truncate">{item.description}</td>
                        <td className="py-3 px-4">₹{item.price}</td>
                        <td className="py-3 px-4 text-green-600">₹{item.discountPrice}</td>
                        <td className="py-3 px-4 flex gap-3">
                          <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                            
                            View
                          </button>
                          <button className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1">
                           
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
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

        <footer className="mt-auto"><Footer /></footer>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 animate-[fadeIn_.15s_ease-out]">
            <h2 className="text-lg font-semibold mb-4">Add New Product</h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-sm font-medium">Product Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <input
                    type="number"
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Discount Price</label>
                  <input
                    type="number"
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.discountPrice}
                    onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
                >
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
