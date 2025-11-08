import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { FiLogIn } from "react-icons/fi";
import { ImSpinner2 } from "react-icons/im";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rememberFlag = localStorage.getItem("remember");
    const token = localStorage.getItem("token");
    if (token && !rememberFlag) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("perms");
    }
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
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

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErr(error?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom animations + small utility CSS */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-float, .animate-entrance, .shimmer { animation: none !important; transition: none !important; }
        }

        @keyframes float {
          0% { transform: translateY(0) rotate(0deg) }
          50% { transform: translateY(-10px) rotate(1deg) }
          100% { transform: translateY(0) rotate(0deg) }
        }

        @keyframes entrance {
          0% { opacity: 0; transform: translateY(8px) scale(0.995) }
          100% { opacity: 1; transform: translateY(0) scale(1) }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-float { animation: float 6s ease-in-out infinite; transform-origin: center; }
        .animate-entrance { animation: entrance 520ms cubic-bezier(.2,.9,.2,1) both; }
        .shimmer {
          background-image: linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.00) 100%);
          background-size: 200% 100%;
          animation: shimmer 2.2s linear infinite;
        }

        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.62));
          backdrop-filter: blur(6px) saturate(120%);
        }
      `}</style>

      <div className="min-h-screen w-full bg-white flex items-center justify-center px-3 py-6">
        {/* CARD */}
        <div
          className={`rounded-xl shadow-[0_18px_60px_rgba(2,6,23,0.18)] border border-black/6 flex w-full max-w-5xl overflow-hidden transform transition-all duration-450 ${
            mounted ? "scale-100 opacity-100" : "scale-98 opacity-0"
          }`}
          aria-live="polite"
        >
          {/* LEFT PANEL */}
          <div className="hidden md:flex flex-col justify-center items-center w-1/2 px-10 py-12 relative overflow-hidden bg-gradient-to-br from-[#e8f5e9] via-[#d0f0d8] to-[#c8f7e0]">
            <div className="absolute inset-0 pointer-events-none opacity-40 blur-sm bg-white/30"></div>

            <div className={`w-full -mt-10 h-full flex flex-col justify-center items-center gap-6 animate-entrance`}>
              <h2 className="leading-tight font-extrabold">
                <span className="block text-xl md:text-2xl text-emerald-700">Join</span>
                <span className="block text-2xl md:text-3xl text-emerald-600">Crispy Dosa Today</span>
              </h2>
              <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
                <div className="absolute -left-10 -top-12 w-40 h-40 rounded-2xl opacity-30 blur-2xl bg-gradient-to-tr from-[#b2f5ea] to-[#c8f7e0]"></div>
                <img
                  src="/login-side.png"
                  alt="Login Illustration"
                  className="w-64 mt-10 h-auto select-none animate-float drop-shadow-2xl transform-gpu transition-all duration-700"
                  draggable="false"
                />
              </div>
            </div>

            <div className="absolute -right-10 -bottom-16 w-56 h-56 rounded-full opacity-10 bg-gradient-to-tr from-[#7C4DFF] to-[#00BCD4]"></div>
          </div>

          {/* DIVIDER */}
          <div className="hidden md:block w-[1px] bg-gray-200/60"></div>

          {/* RIGHT LOGIN SIDE */}
          <div className="flex-1 px-6 sm:px-10 py-8 bg-gradient-to-br from-[#f4fff7] via-[#e5ffef] to-[#d9ffe6] glass">
            <div className="flex justify-center">
              <div className="flex items-center gap-3 animate-entrance">
                <img
                  src="/Crispy-Dosalogo.png"
                  alt="Crispydosa"
                  className="h-14 md:h-18 -mb-4 object-contain transform transition-transform duration-300 hover:scale-105"
                  draggable="false"
                />
              </div>
            </div>

            <div className="mt-4 text-center animate-entrance">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Crispydosa</span>
              </div>
              <h2 className="leading-tight font-extrabold">
                <span className="block text-xl md:text-2xl text-emerald-700">Welcome back</span>
                <span className="block text-2xl md:text-3xl text-emerald-600">Crispy Dosa Dashboard</span>
              </h2>
            </div>

            {err && (
              <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200 animate-entrance">
                {err}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="Email address"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow duration-200 shadow-sm"
                required
                aria-label="Email address"
              />

              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow duration-200 shadow-sm"
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm p-1 rounded"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-md text-sm disabled:opacity-60 shadow-md transform transition-transform duration-200 active:scale-98"
                >
                  {loading ? (
                    <>
                      <ImSpinner2 className="animate-spin mr-2 text-white text-base" />
                      Logging in…
                    </>
                  ) : (
                    <>
                      <FiLogIn className="mr-2 text-white text-base" />
                      Login
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">
              Forgot password? <span className="text-emerald-700 font-medium">Contact admin</span>
            </p>

            <div className="mt-6 text-center text-[11px] text-slate-500">
              <span className="mr-3">© {new Date().getFullYear()} Crispy Dosa</span>
              <span className="hidden sm:inline">·</span>
              <a href="#" className="ml-3 text-slate-600 hover:text-emerald-700">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
