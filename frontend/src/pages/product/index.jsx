import { useState, useEffect, useMemo } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ProductPage() {
  const API = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const CONTAINS_OPTIONS = [
    { key: "Dairy", icon: "/contains/Dairy.png" },
    { key: "Gluten", icon: "/contains/Gluten.png" },
    { key: "Mild", icon: "/contains/Mild.png" },
    { key: "Nuts", icon: "/contains/Nuts.png" },
    { key: "Sesame", icon: "/contains/Sesame.png" },
    { key: "Vegan", icon: "/contains/Vegan.png" },
    { key: "Vegetarian", icon: "/contains/Vegetarian.png" },
  ];

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced query to avoid filtering on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    cat_id: "",
    contains: [],
    image: null, // File or null
    oldImage: null, // existing image filename (for edit)
  });

  // For mobile/desktop modal animation control
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [modalSlideIn, setModalSlideIn] = useState(false); // controls slide animation

  // --- Data loading
  useEffect(() => {
    fetch(`${API}/category`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setCategories)
      .catch((err) => console.error("Error loading categories:", err));

    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(data => {
        // Defensive: Ensure contains is always an array
        const safeData = data.map(p => {
          let c = p.contains;
          try {
            if (typeof c === 'string') c = JSON.parse(c);
            if (typeof c === 'string') c = JSON.parse(c); // Handle double-serialization
          } catch (e) { /* ignore */ }
          return { ...p, contains: Array.isArray(c) ? c : [] };
        });
        setProducts(safeData.sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch((err) => console.error("Error loading products:", err));
  }, [API, token]);

  // handle resize to detect mobile vs desktop
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Debounce the search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // --- Helpers
  const formatGBP = (value) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value || 0);

  // compute API base (strip trailing /api if present) for uploads
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";

  // small helper to show image preview from File or existing path
  const imagePreviewUrl = useMemo(() => {
    if (form.image instanceof File) {
      return URL.createObjectURL(form.image);
    }
    if (form.oldImage) {
      return `${API_BASE}/uploads/${form.oldImage}`;
    }
    return null;
  }, [form.image, form.oldImage, API_BASE]);

  // revoke objectURL when image file changes or component unmounts
  useEffect(() => {
    let currentUrl = null;
    if (form.image instanceof File) {
      currentUrl = URL.createObjectURL(form.image);
    }
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.image]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // CATEGORY FILTER
    if (filterCategory !== "all") {
      list = list.filter((p) => String(p.cat_id) === String(filterCategory));
    }

    // SEARCH FILTER
    if (!debouncedQuery) return list;

    const q = debouncedQuery;
    return list.filter((p) => {
      if (p.name?.toLowerCase().includes(q)) return true;
      if (p.description?.toLowerCase().includes(q)) return true;

      const catName = categories.find((c) => c.id == p.cat_id)?.name;
      if (catName?.toLowerCase().includes(q)) return true;

      if (p.price?.toString().includes(q)) return true;
      if (p.discountPrice?.toString().includes(q)) return true;

      return false;
    });
  }, [products, categories, debouncedQuery, filterCategory]);


  const toggleContains = (key) => {
    setForm((prev) => {
      if (prev.contains.includes(key)) {
        return { ...prev, contains: prev.contains.filter((c) => c !== key) };
      } else {
        return { ...prev, contains: [...prev.contains, key] };
      }
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameTrim = form.name?.trim();
    if (!nameTrim) {
      alert("Please enter product name");
      return;
    }

    const localExists = products.some(
      (p) => p.id !== form.id && p.name?.trim().toLowerCase() === nameTrim.toLowerCase()
    );
    if (localExists) {
      alert("Product name already exists");
      return;
    }

    const rawPrice = parseFloat(form.price || 0);
    if (rawPrice <= 0) {
      alert("Price must be greater than zero");
      return;
    }

    let finalPrice = rawPrice;
    let discountPriceToSend = ""; // original price

    if (form.discountPrice && form.discountPrice.toString().trim() !== "") {
      const discountInput = parseFloat(form.discountPrice.toString().replace("%", "").trim());

      if (Number.isNaN(discountInput) || discountInput < 0) {
        alert("Invalid discount value");
        return;
      }

      if (discountInput > 0 && discountInput <= 100) {
        // percentage discount
        finalPrice = +(rawPrice - (rawPrice * discountInput) / 100).toFixed(2);
        discountPriceToSend = rawPrice; // keep original price for display
      } else if (discountInput > 100) {
        // treat as absolute discount price if entered > 100
        finalPrice = rawPrice;
        discountPriceToSend = discountInput;
      }
    }

    const fd = new FormData();
    fd.append("name", nameTrim);
    fd.append("description", form.description || "");
    fd.append("price", finalPrice);
    fd.append("discountPrice", discountPriceToSend);
    fd.append("cat_id", form.cat_id || "");
    fd.append("contains", JSON.stringify(form.contains));

    // ✅ ONLY append image if a new one was selected
    if (form.image instanceof File) fd.append("image", form.image);
    // ❌ DON'T send form.oldImage - let backend preserve existing

    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `${API}/products/${form.id}` : `${API}/products`;

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Server error" }));
        if (res.status === 409) {
          alert(err.message || "Product name already exists");
          return;
        }
        alert(err.message || "Failed to save product");
        return;
      }

      // ✅ CRITICAL: Update state with backend response
      const saved = await res.json();

      // Sanitize response
      let savedContains = saved.contains;
      try {
        if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
        if (typeof savedContains === 'string') savedContains = JSON.parse(savedContains);
      } catch (e) { }
      saved.contains = Array.isArray(savedContains) ? savedContains : [];

      setProducts((prev) =>
        form.id ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
      );

      // Close modal
      if (isMobile) {
        setModalSlideIn(false);
        setTimeout(() => {
          setShowModal(false);
          resetForm();
        }, 300);
      } else {
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error("Save product error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const resetForm = () =>
    setForm({
      id: null,
      name: "",
      description: "",
      price: "",
      discountPrice: "",
      cat_id: "",
      contains: [],
      image: null,
      oldImage: null,
    });


  // --- Delete
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    // play quick visual shake on the delete icon - we will trigger this by toggling a temporary state
    try {
      const res = await fetch(`${API}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Server error" }));
        alert(err.message || "Failed to delete product");
        return;
      }
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete product error:", err);
      alert("Something went wrong while deleting.");
    }
  };

  // --- Toggle status (optimistic)
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));

    try {
      const res = await fetch(`${API}/products/${product.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: product.name, status: newStatus }),
      });

      if (!res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: product.status } : p)));
        const err = await res.json().catch(() => ({ message: "Server error" }));
        alert(err.message || "Failed to update product status");
        return;
      }

      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error("Error toggling product status:", err);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: product.status } : p)));
      alert("Something went wrong while updating status.");
    }
  };

  // ---- DRAG & DROP SORTING ----
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(products);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const updated = items.map((p, i) => ({
      ...p,
      sort_order: i + 1
    }));

    setProducts(updated);

    await fetch(`${API}/products/reorder`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ order: updated })
    });
  };


  const calculateDiscountPercent = (price, discountPrice) => {
    const rawPrice = parseFloat(price || 0);
    const discountedPrice = parseFloat(discountPrice || 0);
    if (rawPrice > 0 && discountedPrice > 0) {
      return Math.round(((rawPrice - discountedPrice) / rawPrice) * 100);
    }
    return 0;
  };

  // Render helpers for small screens: product card
  const ProductCard = ({ p }) => {
    const imgUrl = p.image ? `${API_BASE}/uploads/${p.image}` : null;
    return (
      <div
        className={`bg-white border rounded-2xl p-4 shadow-sm flex gap-4 items-center ${p.status === 0 ? "opacity-60" : ""}`}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={p.name}
            className="h-20 w-20 rounded-lg object-cover flex-shrink-0 border"
          />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs text-gray-400 border">
            No image
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
              <p className="text-sm text-gray-500 truncate mt-1">{p.description}</p>
              {Array.isArray(p.contains) && p.contains.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {p.contains.map((c) => {
                    const icon = CONTAINS_OPTIONS.find((i) => i.key === c);
                    return icon ? (
                      <img
                        key={c}
                        src={icon.icon}
                        alt={c}
                        title={c}
                        className="h-4 w-4"
                      />
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">{formatGBP(p.price)}</div>
              {p.discountPrice && Number(p.discountPrice) > 0 && (
                <div className="text-sm text-gray-400 line-through">{formatGBP(p.discountPrice)}</div>
              )}

            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-500">{categories.find((c) => c.id == p.cat_id)?.name || "—"}</div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.status === 1}
                  onChange={() => handleToggleStatus(p)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-500 relative after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5"></div>
              </label>

              {/* Edit icon (mobile card) */}
              <button
                onClick={() => {
                  setForm({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    discountPrice: calculateDiscountPercent(p.price, p.discountPrice),
                    cat_id: p.cat_id,
                    contains: p.contains || [],
                    image: null,
                    oldImage: p.image,
                  });
                  // open modal with animation for mobile
                  if (isMobile) {
                    setShowModal(true);
                    setModalSlideIn(false);
                    // allow mount then slide in
                    setTimeout(() => setModalSlideIn(true), 20);
                  } else {
                    setShowModal(true);
                  }
                }}
                aria-label={`Edit ${p.name}`}
                className="p-2 rounded-md hover:scale-105 transition-transform duration-150 inline-flex items-center justify-center focus:outline-none"
                type="button"
              >
                <svg className="w-5 h-5 text-blue-600 hover:text-blue-800 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M4 13.5V20h6.5L20.873 9.627a2 2 0 000-2.828L17.243 3.07a2 2 0 00-2.828 0L4 13.5z" />
                </svg>
              </button>

              {/* Delete icon (mobile card) */}
              <button
                onClick={() => handleDelete(p.id)}
                aria-label={`Delete ${p.name}`}
                className="p-2 rounded-md hover:rotate-6 transition-transform duration-150 inline-flex items-center justify-center focus:outline-none"
                type="button"
              >
                <svg className="w-5 h-5 text-red-600 hover:text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- UI
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="leading-tight font-extrabold">
                  <span className="block text-xl md:text-2xl text-emerald-700">Product Management</span>
                </h2>
                <p className="mt-1 text-sm text-gray-500">Manage menu items — prices, categories, and availability.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-auto">
                  <div className="relative">
                    <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                    </svg>
                    <input
                      placeholder="Search products..."
                      className="pl-10 pr-10 py-2 border rounded-lg shadow-sm w-full sm:w-72 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {/* Clear button */}
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setDebouncedQuery("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="clear search"
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border px-3 py-2 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setForm({
                      id: null,
                      name: "",
                      description: "",
                      price: "",
                      discountPrice: "",
                      cat_id: "",
                      contains: [],
                      image: null,
                      oldImage: null,
                    });
                    if (isMobile) {
                      // mount modal then slide up
                      setShowModal(true);
                      setModalSlideIn(false);
                      setTimeout(() => setModalSlideIn(true), 20);
                    } else {
                      setShowModal(true);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Products
                </button>
              </div>
            </div>

            {/* Content container */}
            <div className="grid grid-cols-1 gap-6">
              {/* Table (desktop) */}
              <div className="hidden md:block rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No products match your search.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-auto min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="py-3 px-4 text-left">Drag</th>
                          <th className="py-3 px-4 text-left">Image</th>
                          <th className="py-3 px-4 text-left">Name</th>
                          <th className="py-3 px-4 text-left">Price</th>
                          <th className="py-3 px-4 text-left">Category</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-left">Actions</th>
                        </tr>
                      </thead>

                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="products">
                          {(provided) => (
                            <tbody
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="text-gray-700"
                            >
                              {filteredProducts.map((p, index) => (
                                <Draggable
                                  key={p.id}
                                  draggableId={String(p.id)}
                                  index={index}
                                >
                                  {(drag) => (
                                    <tr
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      className={`border-b transition ${p.status === 0 ? "opacity-60 bg-gray-50" : "hover:bg-gray-50"
                                        }`}
                                    >
                                      {/* Drag Handle */}
                                      <td {...drag.dragHandleProps} className="px-3 cursor-grab">≡</td>

                                      <td className="py-3 px-4">
                                        <img
                                          src={`${API_BASE}/uploads/${p.image}`}
                                          className="h-12 w-12 rounded-md object-cover border"
                                        />
                                      </td>

                                      <td className="py-3 px-4 font-medium max-w-[260px]">
                                        <div className="truncate">{p.name}</div>
                                        <div className="text-xs text-gray-400 truncate">{p.description}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex gap-1">
                                          {Array.isArray(p.contains) && p.contains.map((c) => {
                                            const icon = CONTAINS_OPTIONS.find((i) => i.key === c);
                                            return icon ? (
                                              <img key={c} src={icon.icon} className="h-4 w-4" />
                                            ) : null;
                                          })}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-semibold">{formatGBP(p.price)}</div>
                                        {p.discountPrice > 0 && (
                                          <div className="text-xs text-gray-400 line-through">
                                            {formatGBP(p.discountPrice)}
                                          </div>
                                        )}
                                      </td>

                                      <td className="py-3 px-4">
                                        {categories.find((c) => c.id == p.cat_id)?.name || "—"}
                                      </td>

                                      <td className="py-3 px-4 text-center">
                                        <label className="inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={p.status === 1}
                                            onChange={() => handleToggleStatus(p)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-emerald-500 relative after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
                                        </label>
                                      </td>

                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-4">
                                          <button
                                            onClick={() => {
                                              setForm({
                                                id: p.id,
                                                name: p.name,
                                                description: p.description,
                                                price: p.price,
                                                discountPrice: calculateDiscountPercent(p.price, p.discountPrice),
                                                cat_id: p.cat_id,
                                                contains: p.contains || [],
                                                image: null,
                                                oldImage: p.image,
                                              });
                                              setShowModal(true);
                                            }}
                                            className="p-1 rounded-md hover:scale-105"
                                          >
                                            ✏️
                                          </button>

                                          <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-1 rounded-md hover:rotate-6"
                                          >
                                            🗑
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
                )}
              </div>


              {/* Cards (mobile) */}
              <div className="md:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No products match your search.</div>
                ) : (
                  filteredProducts.map((p) => <ProductCard key={p.id} p={p} />)
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>


      {/* Modal */}
      {/* We mount modal only when showModal is true to match previous behaviour,
          but for mobile we control slide-in with modalSlideIn state to animate entry/exit. */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
        >
          {/* Desktop / centered modal */}
          {!isMobile ? (
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden md:rounded-2xl">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="text-lg font-semibold">{form.id ? "Edit Product" : "Add Product"}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Product Name</label>
                  <input
                    type="text"
                    placeholder="Product Name"
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Description</label>
                  <textarea
                    placeholder="Description"

                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Discount Price in %</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Discount Price"
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={form.discountPrice}
                    onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Category</label>
                  <select
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={form.cat_id}
                    onChange={(e) => setForm((f) => ({ ...f, cat_id: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600 mb-2 block">Contains</label>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {CONTAINS_OPTIONS.map((item) => {
                      const active = form.contains.includes(item.key);

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleContains(item.key)}
                          className={`border rounded-lg p-2 flex flex-col items-center gap-1 transition
            ${active ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}
          `}
                        >
                          <img
                            src={item.icon}
                            alt={item.key}
                            className={`h-8 w-8 ${active ? "opacity-100" : "opacity-40"}`}
                          />
                          <span className={`text-xs ${active ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                            {item.key}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>


                <div>
                  <label className="text-sm text-gray-600">Image</label>

                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-md px-3 py-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v-6m0 0l-2 2m2-2 2 2" />
                      </svg>
                      <span className="text-sm text-gray-600">Choose Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            image: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                          }))
                        }
                      />
                    </label>

                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="preview" className="h-16 w-16 rounded-md object-cover border" />
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400 border">No image</div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setForm({
                        id: null,
                        name: "",
                        description: "",
                        price: "",
                        discountPrice: "",
                        cat_id: "",
                        contains: [],
                        image: null,
                        oldImage: null,
                      });
                    }}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    {form.id ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Mobile bottom-sheet modal */
            <div
              // container transforms for slide animation
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] ${modalSlideIn ? "translate-y-0" : "translate-y-full"
                } transform transition-transform duration-300`}
              style={{ display: "block" }}
            >
              <div className="bg-white w-full rounded-t-2xl shadow-xl overflow-auto max-h-[92vh]">
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-10 bg-gray-200 rounded-full" />
                    <h3 className="text-lg font-semibold">{form.id ? "Edit Product" : "Add Product"}</h3>
                  </div>
                  <button
                    onClick={() => {
                      // slide out first then unmount
                      setModalSlideIn(false);
                      setTimeout(() => setShowModal(false), 300);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Product Name</label>
                    <input
                      type="text"
                      placeholder="Product Name"
                      required
                      className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Description</label>
                    <textarea
                      placeholder="Description"
                      className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        required
                        className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Discount Price in %</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Discount Price"
                        className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={form.discountPrice}
                        onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Category</label>
                    <select
                      required
                      className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={form.cat_id}
                      onChange={(e) => setForm((f) => ({ ...f, cat_id: e.target.value }))}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Contains</label>
                    <div className="grid grid-cols-4 gap-3">
                      {CONTAINS_OPTIONS.map((item) => {
                        const active = form.contains.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleContains(item.key)}
                            className={`border rounded-lg p-2 flex flex-col items-center gap-1 transition
                              ${active ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}
                            `}
                          >
                            <img
                              src={item.icon}
                              alt={item.key}
                              className={`h-8 w-8 ${active ? "opacity-100" : "opacity-40"}`}
                            />
                            <span className={`text-xs ${active ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                              {item.key}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Image</label>

                    <div className="mt-1 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-md px-3 py-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v-6m0 0l-2 2m2-2 2 2" />
                        </svg>
                        <span className="text-sm text-gray-600">Choose Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              image: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                            }))
                          }
                        />
                      </label>

                      {imagePreviewUrl ? (
                        <img src={imagePreviewUrl} alt="preview" className="h-16 w-16 rounded-md object-cover border" />
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400 border">No image</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // slide out then unmount
                        setModalSlideIn(false);
                        setTimeout(() => {
                          setShowModal(false);
                          setForm({
                            id: null,
                            name: "",
                            description: "",
                            price: "",
                            discountPrice: "",
                            cat_id: "",
                            contains: [],
                            image: null,
                            oldImage: null,
                          });
                        }, 300);
                      }}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      {form.id ? "Update" : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
