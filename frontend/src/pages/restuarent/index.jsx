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
    photo: ""
  });

  const [timings, setTimings] = useState([
    { id: uuidv4(), day: "Monday", start: "10:00", end: "20:00" },
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRestaurant(); }, []);

  const onInfoChange = (k) => (e) =>
    setInfo((prev) => ({ ...prev, [k]: e.target.value }));

  // normalize day to canonical WEEKDAYS values, return null if invalid
  function normalizeDay(raw) {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const day = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return WEEKDAYS.includes(day) ? day : null;
  }

  const isWeekdayPresent = (d) => {
    const nd = normalizeDay(d);
    if (!nd) return false;
    return timings.some((t) => normalizeDay(t.day) === nd);
  };

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
      prev.slice().sort((a, b) => WEEKDAYS.indexOf(normalizeDay(a.day)) - WEEKDAYS.indexOf(normalizeDay(b.day)))
    );
  };

  function updateTiming(id, changes) {
  setTimings(prev =>
    prev.map(t => t.id === id ? { ...t, ...changes } : t)
  );
}

function removeTiming(id) {
  setTimings(prev => prev.filter(t => t.id !== id));
}

  function frontendToApiPayload() {
    // helper to convert "HH:MM" -> "HH:MM:SS"
    const toSqlTime = (s) => {
      if (!s && s !== "") return null;
      const v = String(s).trim();
      if (v === "") return null;
      // if already includes seconds, leave as-is; if format "HH:MM" append :00
      return /^\d{1,2}:\d{2}(:\d{2})?$/.test(v) ? (v.length === 5 ? v + ":00" : v) : null;
    };

    // normalize and validate timings; keep last occurrence for duplicate days
    const byDay = new Map();
    for (const t of timings) {
      const day = normalizeDay(t.day);
      if (!day) continue;
      const opening_time = toSqlTime(t.start);
      const closing_time = toSqlTime(t.end);
      byDay.set(day, { day, opening_time, closing_time });
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
      photo: ""
    });

    if (Array.isArray(restaurant.timings) && restaurant.timings.length) {
      setTimings(
        restaurant.timings.map((t) => ({
          id: String(t.id ?? uuidv4()),
          day: t.day,
          start: t.opening_time ? t.opening_time.substring(0,5) : "",
          end: t.closing_time ? t.closing_time.substring(0,5) : "",
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
      console.error("Failed to load restaurant:", err);
      alert("Failed to load restaurant data. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const payload = frontendToApiPayload();
      const res = await api.post("/restaurant", payload);
      apiToFrontend(res?.data?.data ?? null);
      alert("Saved successfully.");
    } catch (err) {
      console.error("Failed to save restaurant:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to save. Check console.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 pt-16 lg:pl-72 px-6 py-6">
        <h1 className="text-2xl font-semibold mb-6">Restaurant Info</h1>

        <div className="rounded-xl bg-white p-6 border shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Restaurant Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["restaurant_name","Restaurant Name"],
              ["address","Address"],
              ["phone","Phone"],
              ["email","Email"],
              ["facebook","Facebook"],
              ["twitter","Twitter"],
              ["instagram","Instagram"],
              ["linkedin","LinkedIn"],
            ].map(([key,label]) => (
              <div key={key}>
                <label className="block text-sm mb-1">{label}</label>
                <input className="border rounded-md px-3 py-2 w-full"
                  value={info[key]}
                  onChange={onInfoChange(key)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={saveAll}
              disabled={saving || loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Restaurant Timings</h2>
            <button onClick={handleAddManual} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm" disabled={timings.length >= 7}>
              + Add Day
            </button>
          </div>

          <table className="w-full border-t">
            <thead>
              <tr className="bg-emerald-600 text-white text-sm">
                <th className="px-4 py-2 text-left">Day</th>
                <th className="px-4 py-2 text-left">Start</th>
                <th className="px-4 py-2 text-left">End</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timings.map((t) => (
                <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2">
                    <select className="border rounded px-2 py-1 w-full"
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
                  <td className="px-4 py-2"><input type="time" value={t.start} onChange={(e)=>updateTiming(t.id,{start:e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                  <td className="px-4 py-2"><input type="time" value={t.end} onChange={(e)=>updateTiming(t.id,{end:e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                  <td className="px-4 py-2"><button onClick={()=>removeTiming(t.id)} className="text-red-600">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-6">
            <button onClick={saveAll} disabled={saving || loading} className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60">
              {saving ? "Saving..." : "Update Timings"}
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
