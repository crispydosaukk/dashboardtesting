// src/pages/Restuarent.jsx
import React, { useEffect, useState } from "react";
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
    photo: "" // will hold URL from server, e.g. "/uploads/filename.jpg"
  });

  const [photoFile, setPhotoFile] = useState(null); // File object when user picks a new image
  const [photoPreview, setPhotoPreview] = useState(null); // local preview

  const [timings, setTimings] = useState([
    { id: uuidv4(), day: "Monday", start: "10:00", end: "20:00" },
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRestaurant(); }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const onInfoChange = (k) => (e) =>
    setInfo((prev) => ({ ...prev, [k]: e.target.value }));

  function normalizeDay(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const day = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return WEEKDAYS.includes(day) ? day : null;
  }

  const isWeekdayPresent = (d) =>
    timings.some((t) => normalizeDay(t.day) === normalizeDay(d));

  const handleAddManual = () => {
    const present = new Set(timings.map((t) => normalizeDay(t.day)));
    const missing = WEEKDAYS.find((d) => !present.has(d));
    if (!missing) return;
    setTimings((prev) =>
      [...prev, { id: uuidv4(), day: missing, start: "", end: "" }].sort(
        (a, b) => WEEKDAYS.indexOf(normalizeDay(a.day)) - WEEKDAYS.indexOf(normalizeDay(b.day))
      )
    );
  };

  const changeDay = (id, newDayRaw) => {
    const newDay = normalizeDay(newDayRaw);
    if (!newDay || isWeekdayPresent(newDay)) return;
    updateTiming(id, { day: newDay });
    setTimings((prev) =>
      prev.slice().sort(
        (a, b) => WEEKDAYS.indexOf(normalizeDay(a.day)) - WEEKDAYS.indexOf(normalizeDay(b.day))
      )
    );
  };

  function updateTiming(id, changes) {
    setTimings(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  }

  function removeTiming(id) {
    setTimings(prev => prev.filter(t => t.id !== id));
  }

  function frontendToApiPayload() {
    const toSqlTime = (s) => s && /^\d{1,2}:\d{2}$/.test(s) ? s + ":00" : s || null;
    const byDay = new Map();
    for (const t of timings) {
      const day = normalizeDay(t.day);
      if (!day) continue;
      byDay.set(day, { day, opening_time: toSqlTime(t.start), closing_time: toSqlTime(t.end) });
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
      // When not uploading file, keep existing photo URL so DB won't be cleared.
      restaurant_photo: info.photo || null,
      timings: Array.from(byDay.values()).sort((a,b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)),
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) {
      setInfo({
        restaurant_name: "",
        address: "",
        phone: "",
        email: "",
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: "",
        photo: ""
      });
      setTimings([{ id: uuidv4(), day: "Monday", start: "", end: "" }]);
      setPhotoFile(null);
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
      photo: restaurant.restaurant_photo ?? "" // this should be the public path like "/uploads/xxx.jpg"
    });

    setPhotoFile(null);
    setPhotoPreview(null);

    if (Array.isArray(restaurant.timings) && restaurant.timings.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: String(t.id ?? uuidv4()),
          day: t.day,
          start: t.opening_time?.substring(0,5) || "",
          end: t.closing_time?.substring(0,5) || "",
        })).sort((a,b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
      );
    } else {
      setTimings([{ id: uuidv4(), day: "Monday", start: "", end: "" }]);
    }
  }

  async function loadRestaurant() {
    setLoading(true);
    try {
      const res = await api.get("/restaurant");
      apiToFrontend(res?.data?.data ?? null);
    } catch (err) {
      console.error(err);
      alert("Failed to load restaurant data.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();

      if (photoFile) {
        // Use multipart/form-data when a new file is provided
        const fd = new FormData();
        // append file
        fd.append("photo", photoFile);
        // append other fields as strings
        for (const [k, v] of Object.entries(payload)) {
          if (k === "timings") {
            fd.append("timings", JSON.stringify(v));
          } else if (v !== undefined && v !== null) {
            fd.append(k, String(v));
          } else {
            fd.append(k, "");
          }
        }
        const res = await api.post("/restaurant", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        apiToFrontend(res?.data?.data ?? null);
      } else {
        // send JSON (no file)
        const res = await api.post("/restaurant", payload);
        apiToFrontend(res?.data?.data ?? null);
      }

      alert("Saved successfully.");
    } catch (err) {
      console.error("save error:", err);
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setPhotoFile(f);
    } else {
      setPhotoFile(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 lg:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Restaurant Information</h1>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-4">Restaurant Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["restaurant_name","Restaurant Name"],
                  ["address","Address"],
                  ["phone","Phone"],
                  ["email","Email"],
                  ["facebook","Facebook"],
                  ["twitter","Twitter"],
                  ["instagram","Instagram"],
                  ["linkedin","LinkedIn"],
                  ["parking_info","Parking Info"],
                ].map(([key,label]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-600 mb-1">{label}</label>
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      value={info[key]}
                      onChange={onInfoChange(key)}
                    />
                  </div>
                ))}
              </div>

             {/* Photo column */}
              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Restaurant Photo</label>

                <div className="relative w-40 h-40 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" />
                  ) : info.photo ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL.replace("/api", "")}${info.photo}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">No Photo</span>
                  )}
                </div>

                {/* Upload button */}
                <label className="px-3 py-1.5 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                </label>

                {/* Remove button */}
                {photoFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove selected photo
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={saveAll}
                disabled={saving || loading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Restaurant Timings</h2>
              <button
                onClick={handleAddManual}
                disabled={timings.length >= 7}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm shadow-sm"
              >
                + Add Day
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-700">
                    <th className="py-3 px-4 text-left">Day</th>
                    <th className="py-3 px-4 text-left">Start</th>
                    <th className="py-3 px-4 text-left">End</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {timings.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1 w-full"
                          value={t.day}
                          onChange={(e) => changeDay(t.id, e.target.value)}
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <input type="time" value={t.start}
                          onChange={(e)=>updateTiming(t.id,{start:e.target.value})}
                          className="border border-gray-300 rounded-lg px-2 py-1 w-full"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <input type="time" value={t.end}
                          onChange={(e)=>updateTiming(t.id,{end:e.target.value})}
                          className="border border-gray-300 rounded-lg px-2 py-1 w-full"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <button onClick={()=>removeTiming(t.id)} className="text-red-600 hover:text-red-800 font-medium">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={saveAll}
                disabled={saving || loading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update Timings"}
              </button>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </div>
  );
}
