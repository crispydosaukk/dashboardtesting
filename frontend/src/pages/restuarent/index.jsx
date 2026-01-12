import React, { useEffect, useState, useRef } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import { v4 as uuidv4 } from "uuid";
import api from "../../api.js";
import {
  Store, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin,
  ParkingCircle, Upload, X, Clock, Plus, Trash2, Save, Image as ImageIcon,
  CheckCircle2, AlertCircle, Calendar
} from "lucide-react";

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
        res = await api.post("/restaurant", payload);
      }

      if (res?.data?.data) {
        apiToFrontend(res.data.data);
      }

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

  const InputField = ({ icon: Icon, label, value, onChange, placeholder, type = "text", className = "" }) => (
    <div className={`group ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-[#7b5cf5]" />}
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 
                   focus:outline-none focus:border-[#7b5cf5] focus:ring-4 focus:ring-[#7b5cf5]/10 
                   transition-all duration-200 hover:border-gray-300"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:pl-80 lg:pr-8">
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] rounded-2xl shadow-lg shadow-purple-500/20">
                <Store className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restaurant Profile</h1>
                <p className="text-gray-500 mt-1">Manage your restaurant information and operating hours</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Form - Left Side (2 columns) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Store size={20} />
                    Basic Information
                  </h2>
                </div>

                <div className="p-6 space-y-5">
                  <InputField
                    icon={Store}
                    label="Restaurant Name"
                    value={info.restaurant_name}
                    onChange={onInfoChange("restaurant_name")}
                    placeholder="Enter restaurant name"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField
                      icon={Phone}
                      label="Phone Number"
                      value={info.phone}
                      onChange={onInfoChange("phone")}
                      placeholder="+44 123 456 7890"
                      type="tel"
                    />
                    <InputField
                      icon={Mail}
                      label="Email Address"
                      value={info.email}
                      onChange={onInfoChange("email")}
                      placeholder="contact@restaurant.com"
                      type="email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={16} className="text-[#7b5cf5]" />
                      Address
                    </label>
                    <textarea
                      rows={3}
                      value={info.address}
                      onChange={onInfoChange("address")}
                      placeholder="Full restaurant address"
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 
                               focus:outline-none focus:border-[#7b5cf5] focus:ring-4 focus:ring-[#7b5cf5]/10 
                               transition-all duration-200 hover:border-gray-300 resize-none"
                    />
                  </div>

                  <InputField
                    icon={ParkingCircle}
                    label="Parking Information"
                    value={info.parking_info}
                    onChange={onInfoChange("parking_info")}
                    placeholder="e.g., Free parking available, Valet service"
                  />
                </div>
              </div>

              {/* Social Media Links Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Social Media</h2>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    icon={Facebook}
                    label="Facebook"
                    value={info.facebook}
                    onChange={onInfoChange("facebook")}
                    placeholder="Facebook profile URL"
                  />
                  <InputField
                    icon={Instagram}
                    label="Instagram"
                    value={info.instagram}
                    onChange={onInfoChange("instagram")}
                    placeholder="Instagram profile URL"
                  />
                  <InputField
                    icon={Twitter}
                    label="Twitter"
                    value={info.twitter}
                    onChange={onInfoChange("twitter")}
                    placeholder="Twitter profile URL"
                  />
                  <InputField
                    icon={Linkedin}
                    label="LinkedIn"
                    value={info.linkedin}
                    onChange={onInfoChange("linkedin")}
                    placeholder="LinkedIn profile URL"
                  />
                </div>
              </div>

              {/* Service Options Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Service Options</h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="relative flex items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 cursor-pointer hover:shadow-md transition-all duration-200 group">
                      <input
                        type="checkbox"
                        checked={info.instore}
                        onChange={(e) => setInfo((p) => ({ ...p, instore: e.target.checked }))}
                        className="w-5 h-5 text-[#7b5cf5] border-gray-300 rounded focus:ring-[#7b5cf5] focus:ring-2"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-bold text-gray-900">In-Store Pickup</span>
                        <span className="text-xs text-gray-500">Customers can pick up orders inside</span>
                      </div>
                      {info.instore && <CheckCircle2 className="text-[#7b5cf5]" size={20} />}
                    </label>

                    <label className="relative flex items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 cursor-pointer hover:shadow-md transition-all duration-200 group">
                      <input
                        type="checkbox"
                        checked={info.kerbside}
                        onChange={(e) => setInfo((p) => ({ ...p, kerbside: e.target.checked }))}
                        className="w-5 h-5 text-[#7b5cf5] border-gray-300 rounded focus:ring-[#7b5cf5] focus:ring-2"
                      />
                      <div className="ml-3 flex-1">
                        <span className="block text-sm font-bold text-gray-900">Kerbside Pickup</span>
                        <span className="text-xs text-gray-500">Curbside delivery available</span>
                      </div>
                      {info.kerbside && <CheckCircle2 className="text-[#7b5cf5]" size={20} />}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">

              {/* Photo Upload Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon size={20} />
                    Restaurant Photo
                  </h2>
                </div>

                <div className="p-6">
                  <div className="relative group">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-purple-400 transition-all duration-200">
                      {photoPreview ? (
                        <div className="relative w-full h-full">
                          <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transform hover:scale-110 transition-all"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      ) : info.photo ? (
                        <div className="relative w-full h-full">
                          <img
                            src={info.photo.startsWith('http') ? info.photo : `${API_BASE}/uploads/${info.photo}`}
                            className="w-full h-full object-cover"
                            alt="Restaurant"
                            onError={(e) => {
                              console.error("Image load failed:", e.target.src);
                              e.target.src = "";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => fileInputRef.current.click()}
                              className="p-3 bg-gradient-to-r from-[#5f6eea] to-[#7b5cf5] hover:from-[#7b5cf5] hover:to-[#ec4899] text-white rounded-full shadow-lg transform hover:scale-110 transition-all"
                            >
                              <Upload size={20} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={48} strokeWidth={1.5} className="mb-3" />
                          <span className="text-sm font-medium">No image uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] hover:from-[#7b5cf5] hover:to-[#ec4899] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    {photoFile || info.photo ? "Change Photo" : "Upload Photo"}
                  </button>

                  {photoFile && (
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="mt-2 w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl border-2 border-red-200 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Remove New Photo
                    </button>
                  )}
                </div>

                {/* Save Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] hover:from-[#7b5cf5] hover:to-[#ec4899] disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {saving ? "Saving..." : "Save All Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Hours Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#5f6eea] via-[#7b5cf5] to-[#ec4899] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar size={24} />
                Operating Hours
              </h2>
              <button
                onClick={handleAddManual}
                disabled={timings.length >= 7}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white font-semibold rounded-lg backdrop-blur-sm transition-all duration-200 flex items-center gap-2 justify-center sm:justify-start disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Add Day
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {timings.map((t, index) => (
                  <div
                    key={t.id}
                    className={`group relative bg-gradient-to-br ${t.is_active
                      ? 'from-white to-purple-50/30 border-purple-200 hover:shadow-md'
                      : 'from-gray-50 to-gray-100 border-gray-300 opacity-60'
                      } border-2 rounded-xl p-4 transition-all duration-200`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                      {/* Day Selector */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Day</label>
                        <select
                          value={t.day}
                          onChange={(e) => changeDay(t.id, e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-800 font-medium focus:outline-none focus:border-[#7b5cf5] focus:ring-2 focus:ring-[#7b5cf5]/20 transition-all"
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d} disabled={isWeekdayPresent(d) && t.day !== d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Time */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Opening Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="time"
                            value={t.start}
                            onChange={(e) => updateTiming(t.id, { start: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-800 font-medium focus:outline-none focus:border-[#7b5cf5] focus:ring-2 focus:ring-[#7b5cf5]/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Closing Time</label>
                        <div className="relative">
                          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="time"
                            value={t.end}
                            onChange={(e) => updateTiming(t.id, { end: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-800 font-medium focus:outline-none focus:border-[#7b5cf5] focus:ring-2 focus:ring-[#7b5cf5]/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Active Toggle & Remove */}
                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group/toggle">
                          <input
                            type="checkbox"
                            checked={!!t.is_active}
                            onChange={(e) => updateTiming(t.id, { is_active: e.target.checked })}
                            className="w-5 h-5 text-[#7b5cf5] border-gray-300 rounded focus:ring-[#7b5cf5] focus:ring-2"
                          />
                          <span className="text-sm font-semibold text-gray-700 group-hover/toggle:text-[#7b5cf5] transition-colors">
                            {t.is_active ? 'Active' : 'Closed'}
                          </span>
                        </label>

                        <button
                          onClick={() => removeTiming(t.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Remove this day"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {t.is_active && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-[#7b5cf5] rounded-full animate-pulse"></div>
                    )}
                  </div>
                ))}
              </div>

              {timings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No operating hours set</p>
                  <p className="text-sm mt-1">Click "Add Day" to add your first operating hour</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
