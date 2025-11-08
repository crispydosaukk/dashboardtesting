// src/pages/Restuarent.jsx (Premium Dashboard UI)
import React, { useEffect, useState, useRef } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js";

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function Restuarent() {
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
      [...prev, { id: uuidv4(), day: missing, start: "", end: "", is_active: true }].sort(
        (a, b) => WEEKDAYS.indexOf(normalizeDay(a.day)) - WEEKDAYS.indexOf(normalizeDay(b.day))
      )
    );
  };

  const changeDay = (id, newDayRaw) => {
    const newDay = normalizeDay(newDayRaw);
    if (!newDay || isWeekdayPresent(newDay)) return;
    updateTiming(id, { day: newDay });
    setTimings((prev) => prev.slice().sort(
      (a, b) => WEEKDAYS.indexOf(normalizeDay(a.day)) - WEEKDAYS.indexOf(normalizeDay(b.day))
    ));
  };

  function updateTiming(id, changes) { setTimings(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t)); }
  function removeTiming(id) { setTimings(prev => prev.filter(t => t.id !== id)); }

  function frontendToApiPayload() {
    const toSqlTime = (s) => {
      if (!s) return null;
      if (/^\d{1,2}:\d{2}$/.test(s)) return s + ":00";
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
      return null;
    };

    const byDay = [];
    for (const t of timings) {
      const day = normalizeDay(t.day);
      if (!day) continue;
      byDay.push({ day, opening_time: toSqlTime(t.start), closing_time: toSqlTime(t.end), is_active: !!t.is_active });
    }

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
      restaurant_photo: info.photo || null,
      timings: byDay.sort((a,b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)),
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) {
      setInfo({ restaurant_name: "", address: "", phone: "", email: "", facebook: "", twitter: "", instagram: "", linkedin: "", parking_info: "", photo: "" });
      setTimings([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
      setPhotoFile(null); setPhotoPreview(null);
      return;
    }

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
      photo: restaurant.restaurant_photo ?? ""
    });

    setPhotoFile(null); setPhotoPreview(null);

    if (Array.isArray(restaurant.timings) && restaurant.timings.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: String(t.id ?? uuidv4()),
          day: t.day,
          start: t.opening_time?.substring(0,5) || "",
          end: t.closing_time?.substring(0,5) || "",
          is_active: !!(t.is_active || t.is_active === 1)
        })).sort((a,b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
      );
    } else {
      setTimings([{ id: uuidv4(), day: "Monday", start: "", end: "", is_active: true }]);
    }
  }

  async function loadRestaurant() {
    setLoading(true);
    try {
      const res = await api.get("/restaurant");
      apiToFrontend(res?.data?.data ?? null);
    } catch (err) {
      console.error(err);
      // non-blocking: optionally show toast
    } finally { setLoading(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();

      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        for (const [k, v] of Object.entries(payload)) {
          if (k === "timings") fd.append("timings", JSON.stringify(v));
          else if (v !== undefined && v !== null) fd.append(k, String(v)); else fd.append(k, "");
        }
        const res = await api.post("/restaurant", fd, { headers: { "Content-Type": "multipart/form-data" } });
        apiToFrontend(res?.data?.data ?? null);
      } else {
        const res = await api.post("/restaurant", payload);
        apiToFrontend(res?.data?.data ?? null);
      }

      setSaving(false);
      const el = document.getElementById("save-toast");
      if (el) { el.classList.remove("opacity-0"); setTimeout(()=>el.classList.add("opacity-0"), 2200); }
    } catch (err) {
      console.error("save error:", err);
      setSaving(false);
      alert("Failed to save. Check console for details.");
    }
  }

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setPhotoFile(f); else { setPhotoFile(null); }
  };

  // Drag/drop helpers
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setPhotoFile(f);
  };
  const onDragOver = (e) => e.preventDefault();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 antialiased text-slate-800">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-72 pt-16">
        <div className="max-w-7xl mx-auto px-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Restaurant Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Manage your restaurant profile, photo, and weekly timings.</p>
            </div>

           
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details form */}
            <section className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
              <h2 className="text-lg font-medium mb-4">Restaurant Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Restaurant Name</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" value={info.restaurant_name} onChange={onInfoChange("restaurant_name")} />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm" value={info.phone} onChange={onInfoChange("phone")} />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm" value={info.email} onChange={onInfoChange("email")} />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm" value={info.address} onChange={onInfoChange("address")} />
                </div>

                {/* Socials */}
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Facebook</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={info.facebook} onChange={onInfoChange("facebook")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Instagram</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={info.instagram} onChange={onInfoChange("instagram")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Twitter</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={info.twitter} onChange={onInfoChange("twitter")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">LinkedIn</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={info.linkedin} onChange={onInfoChange("linkedin")} />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parking Info</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={info.parking_info} onChange={onInfoChange("parking_info")} />
                </div>

              </div>
            </section>

            {/* Right: Photo card and quick stats */}
            <aside className="space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Restaurant Photo</h3>
                  <span className="text-xs text-slate-500">Recommended: 1200×800</span>
                </div>

                <div onDrop={onDrop} onDragOver={onDragOver} className="relative rounded-lg border-dashed border-2 border-slate-200 p-3 flex items-center justify-center">
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : info.photo ? (
                      <img src={`${import.meta.env.VITE_API_URL.replace('/api','')}${info.photo}`} alt="restaurant" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-sm text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4v8z"/></svg>
                        <div>Drag & drop or upload</div>
                      </div>
                    )}
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm shadow-sm">Upload</button>
                  {photoFile && (
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm">Remove</button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setTimings([{ id: uuidv4(), day: 'Monday', start: '', end: '', is_active: true }])} className="text-left px-3 py-2 rounded-md bg-slate-50 border border-slate-100 text-sm">Reset Timings</button>
                </div>
              </div>
               <div className="flex items-center gap-3 ml-28 mt-20">
                <button onClick={loadRestaurant} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:shadow-md text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6"/></svg>
                  <span>{loading ? "Loading..." : "Reload"}</span>
                </button>

                <button onClick={saveAll} disabled={saving || loading} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h8l4 4v8a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"/></svg>
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </aside>
          </div>

          {/* Timings table */}
          <section className="mt-6 bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Weekly Timings</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleAddManual} disabled={timings.length >= 7} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm">+ Add Day</button>
                <button onClick={() => setTimings([])} className="px-3 py-2 bg-white border rounded-md text-sm">Clear</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Start</th>
                    <th className="py-3 px-4">End</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timings.map((t) => (
                    <tr key={t.id} className={`${!t.is_active ? 'opacity-70' : ''} border-b hover:bg-slate-50`}>
                      <td className="py-3 px-4 w-40">
                        <select value={t.day} onChange={(e)=>changeDay(t.id,e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1">
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 w-36"><input type="time" value={t.start} onChange={(e)=>updateTiming(t.id,{start:e.target.value})} className="rounded-md border border-slate-200 px-2 py-1 w-full" /></td>
                      <td className="py-3 px-4 w-36"><input type="time" value={t.end} onChange={(e)=>updateTiming(t.id,{end:e.target.value})} className="rounded-md border border-slate-200 px-2 py-1 w-full" /></td>
                      <td className="py-3 px-4 w-24">
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={!!t.is_active} onChange={(e)=>updateTiming(t.id,{is_active:e.target.checked})} className="form-checkbox h-5 w-5" />
                          <span className="ml-2 text-sm">{t.is_active ? 'On' : 'Off'}</span>
                        </label>
                      </td>
                      <td className="py-3 px-4 w-36">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>removeTiming(t.id)} className="text-sm text-red-600">Remove</button>
                          <button onClick={()=>updateTiming(t.id,{start:'09:00',end:'18:00',is_active:true})} className="text-sm text-slate-600">Set 9–6</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={saveAll} disabled={saving || loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow">{saving ? 'Saving...' : 'Update Timings'}</button>
            </div>
          </section>

          <div id="save-toast" className="fixed right-6 bottom-6 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-lg opacity-0 transition-opacity">Saved</div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
