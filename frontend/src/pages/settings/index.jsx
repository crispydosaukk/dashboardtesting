import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [form, setForm] = useState({
    signup_flat_amount: "",
    referral_flat_amount: "",
    minimum_order: "",
    minimum_cart_total: "",

    // ✅ Loyalty dynamic settings
    loyalty_points_per_gbp: "",
    loyalty_redeem_points: "",
    loyalty_redeem_value: "",
    loyalty_available_after_hours: "",
    loyalty_expiry_days: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- LOAD EXISTING SETTINGS ----------
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");

      if (res.data?.status === 1 && res.data.data) {
        const s = res.data.data;

        setForm({
          signup_flat_amount: s.signup_flat_amount ?? "",
          referral_flat_amount: s.referral_flat_amount ?? "",
          minimum_order: s.minimum_order ?? "",
          minimum_cart_total: s.minimum_cart_total ?? "",

          loyalty_points_per_gbp: s.loyalty_points_per_gbp ?? "",
          loyalty_redeem_points: s.loyalty_redeem_points ?? "",
          loyalty_redeem_value: s.loyalty_redeem_value ?? "",
          loyalty_available_after_hours: s.loyalty_available_after_hours ?? "",
          loyalty_expiry_days: s.loyalty_expiry_days ?? "",
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- SAVE (INSERT or UPDATE) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const res = await api.post("/settings", form);

      if (res.data?.status === 1) {
        const s = res.data.data;

        setForm({
          signup_flat_amount: s.signup_flat_amount ?? "",
          referral_flat_amount: s.referral_flat_amount ?? "",
          minimum_order: s.minimum_order ?? "",
          minimum_cart_total: s.minimum_cart_total ?? "",
          loyalty_points_per_gbp: s.loyalty_points_per_gbp ?? "",
          loyalty_redeem_points: s.loyalty_redeem_points ?? "",
          loyalty_redeem_value: s.loyalty_redeem_value ?? "",
          loyalty_available_after_hours: s.loyalty_available_after_hours ?? "",
          loyalty_expiry_days: s.loyalty_expiry_days ?? "",
        });

        alert("Settings saved successfully");
      } else {
        alert(res.data?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      alert("Something went wrong while saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="font-jakarta min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      {/* SAME HEADER + SIDEBAR STYLE AS RESTUARENT */}
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-72 pt-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto pb-10">
          {/* PAGE TITLE */}
          <h2 className="leading-tight font-extrabold ml-0 sm:ml-10">
            <span className="block text-xl md:text-2xl text-emerald-700">
              Settings
            </span>
            <span className="block text-sm md:text-base text-slate-600 mt-1">
              Configure base amounts used for wallet, referral & loyalty logic
              (GBP £).
            </span>
          </h2>

          {/* MAIN CARD */}
          <section className="mt-8 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-black ml-0 sm:ml-10">
            {loading ? (
              <div className="text-sm text-slate-500">Loading settings...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* SECTION HEADING */}
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-emerald-700">
                    Wallet, Referral & Loyalty Settings
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    All amounts are in GBP (£). These values will be used for
                    signup credits, referral rewards, minimum order validation,
                    and loyalty points rules.
                  </p>
                </div>

                {/* FIELDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Signup Flat Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Signup Flat Amount (1st User)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="signup_flat_amount"
                      value={form.signup_flat_amount}
                      onChange={handleChange}
                      placeholder="e.g. £5.00"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Flat amount (in £) credited to the customer wallet after
                      first signup.
                    </p>
                  </div>

                  {/* Referral Flat Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Referral Flat Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="referral_flat_amount"
                      value={form.referral_flat_amount}
                      onChange={handleChange}
                      placeholder="e.g. £2.50"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Amount (in £) credited when a referral successfully
                      completes an order.
                    </p>
                  </div>

                  {/* Minimum Order */}
                  <div className="md:col-span-2 md:max-w-sm">
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Minimum Order
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="minimum_order"
                      value={form.minimum_order}
                      onChange={handleChange}
                      placeholder="e.g. £10.00"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Orders below this amount (in £) will not be eligible for
                      certain offers / wallet usage.
                    </p>
                  </div>
                  <div className="md:col-span-2 md:max-w-sm">
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Minimum Final Order Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="minimum_cart_total"
                      value={form.minimum_cart_total}
                      onChange={handleChange}
                      placeholder="e.g. £12.00"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Orders below this amount cannot be placed (wallet cannot bypass).
                    </p>
                  </div>
                  {/* ✅ Loyalty Points Per GBP */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Loyalty Points Per £ (Earn Rate)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="loyalty_points_per_gbp"
                      value={form.loyalty_points_per_gbp}
                      onChange={handleChange}
                      placeholder="e.g. 1"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Example: 1 means £11.50 → 11 points (floor).
                    </p>
                  </div>

                  {/* ✅ Loyalty Redeem Points */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Loyalty Redeem Points
                    </label>
                    <input
                      type="number"
                      step="1"
                      name="loyalty_redeem_points"
                      value={form.loyalty_redeem_points}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Points required to redeem once.
                    </p>
                  </div>

                  {/* ✅ Loyalty Redeem Value */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Loyalty Redeem Value (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="loyalty_redeem_value"
                      value={form.loyalty_redeem_value}
                      onChange={handleChange}
                      placeholder="e.g. 1.00"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Wallet amount credited when redeem points reached.
                    </p>
                  </div>

                  {/* ✅ Loyalty Available After (Hours) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Loyalty Available After (Hours)
                    </label>
                    <input
                      type="number"
                      step="1"
                      name="loyalty_available_after_hours"
                      value={form.loyalty_available_after_hours}
                      onChange={handleChange}
                      placeholder="e.g. 24"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Points can be redeemed only after this time.
                    </p>
                  </div>

                  {/* ✅ Loyalty Expiry Days */}
                  <div className="md:col-span-2 md:max-w-sm">
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Loyalty Expiry (Days)
                    </label>
                    <input
                      type="number"
                      step="1"
                      name="loyalty_expiry_days"
                      value={form.loyalty_expiry_days}
                      onChange={handleChange}
                      placeholder="e.g. 30"
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Points expire after these days.
                    </p>
                  </div>
                </div>

                {/* INFO BOX */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div className="font-semibold mb-1 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] text-white">
                      i
                    </span>
                    Implementation Note
                  </div>
                  <ul className="list-disc ml-5 space-y-1 text-xs text-emerald-900">
                    <li>
                      Signup amount will be credited to the customer wallet after
                      successful registration.
                    </li>
                    <li>
                      Referral amount will be credited once the referred user
                      completes their first order.
                    </li>
                    <li>
                      Minimum order will be validated during checkout and wallet
                      usage.
                    </li>
                    <li>
                      Loyalty points will be earned based on “paid total” and
                      will be redeemable after the configured hours.
                    </li>
                    <li>
                      Redeem rule: redeem_points → redeem_value (credited to
                      wallet).
                    </li>
                  </ul>
                </div>

                {/* ACTION BUTTON */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium shadow-md"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
