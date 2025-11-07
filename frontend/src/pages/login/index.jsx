import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ If token exists but user didn't click "remember", clear on reload
  useEffect(() => {
    const rememberFlag = localStorage.getItem("remember");
    const token = localStorage.getItem("token");
    if (token && !rememberFlag) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("perms");
    }
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const email = form.email.trim().toLowerCase();
    const password = String(form.password || "");

    if (!email || !password) return setErr("Email and password are required");

    try {
      setLoading(true);

      // clear stale data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("perms");

      const { data } = await api.post("/auth/login", { email, password, remember });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userid", data.user.id);
      localStorage.setItem("perms", JSON.stringify(data.permissions || []));
      if (remember) localStorage.setItem("remember", "1");
      else localStorage.removeItem("remember");

      // ✅ Smooth redirect
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErr(error?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-green-200 via-emerald-300 to-teal-500 flex items-center justify-center px-3 py-4 md:py-8">
      <div className="w-full max-w-[360px] sm:max-w-md md:max-w-lg">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/5 p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/Crispy-Dosalogo.png"
              alt="Crispydosa"
              className="h-14 md:h-16 object-contain"
              draggable="false"
            />
          </div>

          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Crispydosa</span>
            </div>
            <h2 className="leading-tight font-extrabold">
              <span className="block text-[22px] md:text-[26px] text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600">
                Welcome back
              </span>
              <span className="block text-[26px] md:text-[32px] text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Crispy Dosa Dashboard
              </span>
            </h2>
          </div>

          {/* Error */}
          {err && (
            <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200 animate-pulse">
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="Email address"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />

            <div className="relative">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="Password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center items-center gap-2 rounded-md bg-emerald-700 px-5 py-2 text-white text-sm font-medium hover:bg-emerald-800 disabled:opacity-60 transition"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Logging in…
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Forgot password? <span className="text-emerald-700 font-medium">Contact admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
