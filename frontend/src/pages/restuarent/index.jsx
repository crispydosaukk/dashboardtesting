import React, { useEffect, useState, useRef } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];



export default function Restuarent() {
  const API = import.meta.env.VITE_API_URL;
  const API_BASE = API ? API.replace(/\/api\/?$/i, "") : "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [info, setInfo] = useState({
    restaurant_name: "",
    address: "",
    phone: "",
    email: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    parking_info: "",
    instore: false,
    kerbside: false,
    photo: ""
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [timings, setTimings] = useState([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadRestaurant(); }, []);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const onInfoChange = (k) => (e) => setInfo((p) => ({ ...p, [k]: e.target.value }));

  function normalizeDay(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const day = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return WEEKDAYS.includes(day) ? day : null;
  }

  const isWeekdayPresent = (d) => timings.some((t) => normalizeDay(t.day) === normalizeDay(d));

  const handleAddManual = () => {
    const present = new Set(timings.map((t) => normalizeDay(t.day)));
    const missing = WEEKDAYS.find((d) => !present.has(d));
    if (!missing) return;
    setTimings((prev) =>
      [...prev, { id: uuidv4(), day: missing, start: "", end: "", is_active: true }]
        .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
    );
  };

  const changeDay = (id, newDayRaw) => {
    const newDay = normalizeDay(newDayRaw);
    if (!newDay || isWeekdayPresent(newDay)) return;
    updateTiming(id, { day: newDay });
    setTimings((prev) => prev.slice().sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)));
  };

  const updateTiming = (id, changes) => setTimings((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  const removeTiming = (id) => setTimings((prev) => prev.filter((t) => t.id !== id));

  function frontendToApiPayload() {
    const toSqlTime = (s) => (!s ? null : /^\d{1,2}:\d{2}$/.test(s) ? s + ":00" : s);

    return {
      restaurant_name: info.restaurant_name || null,
      restaurant_address: info.address || null,
      restaurant_phonenumber: info.phone || null,
      restaurant_email: info.email || null,
      restaurant_facebook: info.facebook || null,
      restaurant_twitter: info.twitter || null,
      restaurant_instagram: info.instagram || null,
      restaurant_linkedin: info.linkedin || null,
      parking_info: info.parking_info || null,
      instore: info.instore ? 1 : 0,
      kerbside: info.kerbside ? 1 : 0,
      timings: timings.map((t) => ({
        day: t.day,
        opening_time: toSqlTime(t.start),
        closing_time: toSqlTime(t.end),
        is_active: !!t.is_active
      }))
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) return;

    setInfo({
      restaurant_name: restaurant.restaurant_name ?? "",
      address: restaurant.restaurant_address ?? "",
      phone: restaurant.restaurant_phonenumber ?? "",
      email: restaurant.restaurant_email ?? "",
      facebook: restaurant.restaurant_facebook ?? "",
      twitter: restaurant.restaurant_twitter ?? "",
      instagram: restaurant.restaurant_instagram ?? "",
      linkedin: restaurant.restaurant_linkedin ?? "",
      parking_info: restaurant.parking_info ?? "",
      instore: !!restaurant.instore,
      kerbside: !!restaurant.kerbside,
      photo: restaurant.restaurant_photo ?? ""
    });

    if (restaurant.timings?.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: uuidv4(),
          day: t.day,
          start: t.opening_time?.substring(0, 5) || "",
          end: t.closing_time?.substring(0, 5) || "",
          is_active: !!t.is_active
        }))
      );
    }
  }

  async function loadRestaurant() {
    setLoading(true);
    try {
      const res = await api.get("/restaurant");
      apiToFrontend(res?.data?.data);
    } finally { setLoading(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();
      let res;

      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        fd.append("payload", JSON.stringify(payload));

        res = await api.post("/restaurant", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // ✅ FIX: When no new photo, don't send restaurant_photo field
        // Backend will preserve existing photo
        res = await api.post("/restaurant", payload);
      }

      // ✅ CRITICAL: Refresh state with backend response
      if (res?.data?.data) {
        apiToFrontend(res.data.data);
      }

      // Clear local file/preview after successful save
      setPhotoFile(null);
      setPhotoPreview(null);

      alert("Saved Successfully!");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="font-jakarta min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-72 pt-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto pb-10">

          <h2 className="leading-tight font-extrabold ml-0 sm:ml-10">
              <span className="block text-xl md:text-2xl text-emerald-700">Manage your restaurant profile & timings.</span>
            </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

            {/* Left Form */}
            <section className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-black space-y-6 ml-0 sm:ml-10">
              <h2 className="leading-tight font-extrabold">
              <span className="block text-xl md:text-2xl text-emerald-700">Restaurant Details</span>
            </h2>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  ["restaurant_name", "Restaurant Name"],
                  ["phone", "Phone Number"],
                  ["email", "Email Address"],
                  ["facebook", "Facebook Link"],
                  ["instagram", "Instagram Link"],
                  ["twitter", "Twitter Link"],
                  ["linkedin", "LinkedIn Link"]
                ].map(([key, placeholder]) => (
                  <div key={key} className="w-full">
                    <label className="block text-sm font-medium mb-1">{placeholder}</label>
                    <input placeholder={placeholder} className="w-full rounded-lg border border-slate-200 px-4 py-3"
                      value={info[key]} onChange={onInfoChange(key)} />
                  </div>
                ))}

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea rows={3} placeholder="Full address"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    value={info.address} onChange={onInfoChange("address")} />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Parking Info</label>
                  <input placeholder="Parking details (e.g. valet, nearby lot)"
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    value={info.parking_info} onChange={onInfoChange("parking_info")} />
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Service Options</label>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={info.instore}
                      onChange={(e) =>
                        setInfo((p) => ({ ...p, instore: e.target.checked }))
                      }
                    />
                    <span>In-store</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={info.kerbside}
                      onChange={(e) =>
                        setInfo((p) => ({ ...p, kerbside: e.target.checked }))
                      }
                    />
                    <span>Kerbside</span>
                  </label>
                </div>
              </div>

            </section>
            
            {/* Photo Upload */}
            <aside className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <h3 className="text-lg font-semibold mb-2">Restaurant Photo</h3>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <div className="h-48 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-cover" />
                    ) : info.photo ? (
                      <img 
                        src={
                          info.photo.startsWith('http')
                            ? info.photo
                            : `${API_BASE}/uploads/${info.photo}`
                        }
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Image load failed:", e.target.src);
                          e.target.src = "";
                        }}
                      />
                    ) : (
                      <span className="text-sm text-slate-400">No Image Uploaded</span>
                    )}
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e)=>setPhotoFile(e.target.files[0])} className="hidden" />

                  <button onClick={()=>fileInputRef.current.click()} className="mt-4 px-4 py-2 border rounded-md w-full text-sm">
                    Upload Image
                  </button>

                  {photoFile && (
                    <button onClick={()=>{ setPhotoFile(null); setPhotoPreview(null); }} className="mt-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm w-full">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <button onClick={saveAll} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-lg font-medium shadow-lg">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </aside>

          </div>

          {/* Timings Section */}
          <section className="mt-10 rounded-2xl p-6 sm:p-8 shadow-xl border border-black ml-0 sm:ml-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="leading-tight font-extrabold">
                <span className="block text-xl md:text-2xl text-emerald-700">Weekly Timings</span>
              </h2>
              <button onClick={handleAddManual} disabled={timings.length >= 7}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm">
                + Add Day
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base min-w-[600px]">
                <tbody>
                  {timings.map((t) => (
                    <tr key={t.id} className={`border-b transition ${!t.is_active ? "opacity-50 bg-slate-200" : "hover:bg-slate-50"}`}>
                      <td className="py-3 px-2 sm:px-4">
                        <select value={t.day} onChange={(e)=>changeDay(t.id,e.target.value)} className="rounded-md border px-2 py-2 w-full">
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2 sm:px-4"><input type="time" value={t.start} onChange={(e)=>updateTiming(t.id,{start:e.target.value})} className="rounded-md border px-2 py-2 w-full" /></td>
                      <td className="py-3 px-2 sm:px-4"><input type="time" value={t.end} onChange={(e)=>updateTiming(t.id,{end:e.target.value})} className="rounded-md border px-2 py-2 w-full" /></td>
                      <td className="py-3 px-2 sm:px-4 text-center"><input type="checkbox" checked={!!t.is_active} onChange={(e)=>updateTiming(t.id,{is_active:e.target.checked})} /></td>
                      <td className="py-3 px-2 sm:px-4"><button onClick={()=>removeTiming(t.id)} className="text-red-600 text-sm">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={saveAll} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-lg">
                {saving ? "Saving..." : "Update Timings"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
