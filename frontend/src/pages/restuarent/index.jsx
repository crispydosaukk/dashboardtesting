// frontend/src/pages/restuarent/index.jsx
import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js"; // use your shared api wrapper (axios or fetch wrapper)

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
    photo: "" // will contain either URL or base64 string
  });

  const [timings, setTimings] = useState([
    { id: uuidv4(), day: "Monday", start: "10:00", end: "20:00" },
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helpers ----------
  const onInfoChange = (k) => (e) =>
    setInfo((prev) => ({ ...prev, [k]: e.target.value }));

  const isWeekdayPresent = (d) => timings.some((t) => t.day === d);

  const updateTiming = (id, patch) => {
    setTimings((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTiming = (id) => {
    if (timings.length === 1) return alert("At least one day must be present.");
    setTimings((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddManual = () => {
    const present = new Set(timings.map((t) => t.day));
    const missing = WEEKDAYS.find((d) => !present.has(d));
    if (!missing) return alert("All weekdays already added.");
    setTimings((prev) =>
      [...prev, { id: uuidv4(), day: missing, start: "", end: "" }].sort(
        (a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)
      )
    );
  };

  const changeDay = (id, newDay) => {
    if (!newDay) return;
    if (isWeekdayPresent(newDay)) return alert("Day already exists.");
    updateTiming(id, { day: newDay });
    setTimings((prev) =>
      prev.slice().sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
    );
  };

  // Convert a selected file to base64 string
  const handlePhotoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      setInfo((p) => ({ ...p, photo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // ---------- Transformations for API ----------
  function frontendToApiPayload() {
    return {
      restaurant_photo: info.photo || null,
      restaurant_name: info.restaurant_name || null,
      restaurant_address: info.address || null,
      restaurant_phonenumber: info.phone || null,
      restaurant_email: info.email || null,
      restaurant_facebook: info.facebook || null,
      restaurant_twitter: info.twitter || null,
      restaurant_instagram: info.instagram || null,
      restaurant_linkedin: info.linkedin || null,
      timings: timings.map((t) => ({
        // backend expects day, opening_time, closing_time
        day: t.day,
        opening_time: t.start || null,
        closing_time: t.end || null,
      })),
    };
  }

  function apiToFrontend(restaurant) {
    if (!restaurant) {
      // reset to defaults
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
      return;
    }

    setInfo((prev) => ({
      ...prev,
      restaurant_name: restaurant.restaurant_name ?? "",
      address: restaurant.restaurant_address ?? "",
      phone: restaurant.restaurant_phonenumber ?? "",
      email: restaurant.restaurant_email ?? "",
      facebook: restaurant.restaurant_facebook ?? "",
      twitter: restaurant.restaurant_twitter ?? "",
      instagram: restaurant.restaurant_instagram ?? "",
      linkedin: restaurant.restaurant_linkedin ?? "",
      photo: restaurant.restaurant_photo ?? "",
    }));

    if (Array.isArray(restaurant.timings) && restaurant.timings.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: t.id ? String(t.id) : uuidv4(),
          day: t.day,
          start: t.opening_time ? t.opening_time.substring(0,5) : "",
          end: t.closing_time ? t.closing_time.substring(0,5) : "",
        })).sort((a,b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day))
      );
    } else {
      setTimings([{ id: uuidv4(), day: "Monday", start: "", end: "" }]);
    }
  }

  // ---------- API calls (use api wrapper) ----------
  async function loadRestaurant() {
    setLoading(true);
    try {
      const res = await api.get("/restaurant");
      const data = res?.data?.data ?? null;
      apiToFrontend(data);
    } catch (e) {
      console.error("Failed to load restaurant:", e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load restaurant. Check server logs / network.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      // Basic client-side validation: ensure no duplicate days and times make sense
      const daySet = new Set();
      for (const t of timings) {
        if (!t.day) throw new Error("Each timing must have a day selected.");
        if (daySet.has(t.day)) throw new Error(`Duplicate day found: ${t.day}`);
        daySet.add(t.day);

        // If both times provided, ensure start < end
        if (t.start && t.end) {
          // compare "HH:MM" strings lexicographically is OK
          if (t.start >= t.end) throw new Error(`Start time must be before end time for ${t.day}.`);
        }
      }

      const payload = frontendToApiPayload();

      const res = await api.post("/restaurant", payload);
      const returned = res?.data?.data ?? null;
      apiToFrontend(returned);
      alert("Saved successfully.");
    } catch (e) {
      console.error("Error saving:", e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Error saving restaurant.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveInfoOnly() {
    await saveAll();
  }

  async function saveTimingsOnly() {
    await saveAll();
  }

  // ---------- UI ----------
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Restaurant Info</h1>

          {/* Restaurant Info Card */}
          <div className="rounded-xl bg-white p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Restaurant Name</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.restaurant_name}
                  onChange={onInfoChange("restaurant_name")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.address}
                  onChange={onInfoChange("address")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.phone}
                  onChange={onInfoChange("phone")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.email}
                  onChange={onInfoChange("email")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Facebook</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.facebook}
                  onChange={onInfoChange("facebook")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Twitter</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.twitter}
                  onChange={onInfoChange("twitter")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Instagram</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.instagram}
                  onChange={onInfoChange("instagram")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">LinkedIn</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info.linkedin}
                  onChange={onInfoChange("linkedin")}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Photo</label>
                <div className="flex gap-3">
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) handlePhotoFile(f);
                    }}
                    className="border rounded-md px-3 py-2"
                  />
                </div>
                {info.photo ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Preview:</div>
                    <img src={info.photo} alt="preview" className="h-24 rounded object-cover border" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={saveInfoOnly}
                disabled={saving || loading}
                className="px-5 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Update Info"}
              </button>
              <button
                onClick={saveAll}
                disabled={saving || loading}
                className="px-5 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

          {/* Timings Section */}
          <div className="rounded-xl bg-white p-6 border shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Restaurant Timings</h2>
              <button onClick={handleAddManual} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm" disabled={timings.length >= 7}>
                + Add Day
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-gray-200">
                <thead>
                  <tr className="bg-emerald-600 text-white text-sm">
                    <th className="px-4 py-2 text-left font-medium">Day</th>
                    <th className="px-4 py-2 text-left font-medium">Start</th>
                    <th className="px-4 py-2 text-left font-medium">End</th>
                    <th className="px-4 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timings.map((t) => (
                    <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2">
                        <select value={t.day} onChange={(e) => changeDay(t.id, e.target.value)} className="border rounded px-2 py-1 text-sm w-full">
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="time" className="border rounded px-2 py-1 w-full" value={t.start} onChange={(e) => updateTiming(t.id, { start: e.target.value })} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="time" className="border rounded px-2 py-1 w-full" value={t.end} onChange={(e) => updateTiming(t.id, { end: e.target.value })} />
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => removeTiming(t.id)} className="px-3 py-1 rounded border text-red-600 text-sm" disabled={timings.length === 1}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Update Button Bottom Right */}
            <div className="flex justify-end mt-6">
              <button onClick={saveTimingsOnly} disabled={saving || loading} className="px-5 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 text-sm font-medium disabled:opacity-60">
                {saving ? "Saving..." : "Update Timings"}
              </button>
            </div>
          </div>
        </main>

        <footer className="mt-auto"><Footer /></footer>
      </div>
    </div>
  );
}
