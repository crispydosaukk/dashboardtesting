import React, { useEffect, useState } from "react";
import Header from "../../components/common/header.jsx";
import Sidebar from "../../components/common/sidebar.jsx";
import Footer from "../../components/common/footer.jsx";
import api from "../../api.js";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, CreditCard, Gift, ShoppingCart, Percent, Clock, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-teal-800 to-emerald-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col pt-16 lg:pl-72">
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                  <SettingsIcon className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">Settings</h1>
                  <p className="text-white/90 mt-1 text-base drop-shadow">
                    Configure base amounts used for wallet, referral & loyalty logic (GBP £).
                  </p>
                </div>
              </div>

              {/* MAIN CARD */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
                {loading ? (
                  <div className="text-center py-10 text-white/70 animate-pulse">
                    Loading settings...
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* SECTION HEADING */}
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold text-white drop-shadow flex items-center gap-2">
                        <Wallet className="text-emerald-300" size={24} />
                        Wallet, Referral & Loyalty Settings
                      </h3>
                      <p className="text-white/70 mt-1 text-sm">
                        All amounts are in GBP (£). These values will be used for
                        signup credits, referral rewards, minimum order validation,
                        and loyalty points rules.
                      </p>
                    </div>

                    {/* FIELDS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Signup Flat Amount */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Signup Flat Amount (1st User)
                        </label>
                        <div className="relative">
                          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="signup_flat_amount"
                            value={form.signup_flat_amount}
                            onChange={handleChange}
                            placeholder="e.g. 5.00"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Flat amount (in £) credited to the customer wallet after first signup.
                        </p>
                      </div>

                      {/* Referral Flat Amount */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Referral Flat Amount
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="referral_flat_amount"
                            value={form.referral_flat_amount}
                            onChange={handleChange}
                            placeholder="e.g. 2.50"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Amount (in £) credited when a referral successfully completes an order.
                        </p>
                      </div>

                      {/* Minimum Order */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Minimum Order
                        </label>
                        <div className="relative">
                          <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="minimum_order"
                            value={form.minimum_order}
                            onChange={handleChange}
                            placeholder="e.g. 10.00"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Orders below this amount (in £) will not be eligible for certain offers / wallet usage.
                        </p>
                      </div>

                      {/* Minimum Cart Total */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Minimum Final Order Amount
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="minimum_cart_total"
                            value={form.minimum_cart_total}
                            onChange={handleChange}
                            placeholder="e.g. 12.00"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Orders below this amount cannot be placed (wallet cannot bypass).
                        </p>
                      </div>

                      {/* Loyalty Points Per GBP */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Loyalty Points Per £ (Earn Rate)
                        </label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="loyalty_points_per_gbp"
                            value={form.loyalty_points_per_gbp}
                            onChange={handleChange}
                            placeholder="e.g. 1"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Example: 1 means £11.50 → 11 points (floor).
                        </p>
                      </div>

                      {/* Loyalty Redeem Points */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Loyalty Redeem Points
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="1"
                            name="loyalty_redeem_points"
                            value={form.loyalty_redeem_points}
                            onChange={handleChange}
                            placeholder="e.g. 10"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Points required to redeem once.
                        </p>
                      </div>

                      {/* Loyalty Redeem Value */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Loyalty Redeem Value (£)
                        </label>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="0.01"
                            name="loyalty_redeem_value"
                            value={form.loyalty_redeem_value}
                            onChange={handleChange}
                            placeholder="e.g. 1.00"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Wallet amount credited when redeem points reached.
                        </p>
                      </div>

                      {/* Loyalty Available After (Hours) */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Loyalty Available After (Hours)
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="1"
                            name="loyalty_available_after_hours"
                            value={form.loyalty_available_after_hours}
                            onChange={handleChange}
                            placeholder="e.g. 24"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Points can be redeemed only after this time.
                        </p>
                      </div>

                      {/* Loyalty Expiry Days */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Loyalty Expiry (Days)
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                          <input
                            type="number"
                            step="1"
                            name="loyalty_expiry_days"
                            value={form.loyalty_expiry_days}
                            onChange={handleChange}
                            placeholder="e.g. 30"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:bg-white/10"
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1.5">
                          Points expire after these days.
                        </p>
                      </div>
                    </div>

                    {/* INFO BOX */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur-md">
                      <div className="font-bold mb-2 flex items-center gap-2 text-emerald-300">
                        <AlertCircle size={18} />
                        Implementation Note
                      </div>
                      <ul className="list-disc ml-5 space-y-2 text-xs text-white/70">
                        <li>
                          <strong className="text-white">Signup amount</strong> will be credited to the customer wallet after
                          successful registration.
                        </li>
                        <li>
                          <strong className="text-white">Referral amount</strong> will be credited once the referred user
                          completes their first order.
                        </li>
                        <li>
                          <strong className="text-white">Minimum order</strong> will be validated during checkout and wallet
                          usage.
                        </li>
                        <li>
                          <strong className="text-white">Loyalty points</strong> will be earned based on “paid total” and
                          will be redeemable after the configured hours.
                        </li>
                        <li>
                          Redeem rule: <strong className="text-white">redeem_points → redeem_value</strong> (credited to
                          wallet).
                        </li>
                      </ul>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                      >
                        <Save size={20} />
                        {saving ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Helper imports for icons that weren't in the top list but used in code */}
      {/* Accessing hidden icon components if not imported at top would fail, so I'll make sure they are imported. */}
      {/* I used: Users, Wallet, Check, etc. Let's fix the imports at the top. */}
    </div>
  );
}

// Re-importing icons to be safe and clean within the replacement block
import { Users, Wallet, Award, Calendar } from "lucide-react";

