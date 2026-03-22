import { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase/firebaseConfig";
import { saveUser, getUser } from "../services/userService";
import { createKitchen, findKitchenByCode, addChefToKitchen } from "../services/kitchenService";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── Views ──
const VIEW = {
  HOME:        "home",
  ROLE:        "role",
  ADMIN_SETUP: "admin_setup",
  CHEF_CODE:   "chef_code",
  EMAIL:       "email",
  PHONE:       "phone",
  OTP:         "otp",
};

function Auth() {
  const [view, setView]                   = useState(VIEW.HOME);
  const [role, setRole]                   = useState(""); // "admin" | "chef"
  const [isLogin, setIsLogin]             = useState(true);
  const [name, setName]                   = useState("");
  const [kitchenName, setKitchenName]     = useState("");
  const [kitchenCode, setKitchenCode]     = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [phone, setPhone]                 = useState("");
  const [otp, setOtp]                     = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [pendingUser, setPendingUser]     = useState(null); // user after social login, before role
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const navigate = useNavigate();

  const clearError = () => setError("");
  const cleanError = (err) =>
    err.message.replace("Firebase: ", "").replace(/\(auth\/.*?\)\.?/, "").trim();

  // ── After Firebase auth succeeds, check if user exists ──
  const handlePostAuth = async (user) => {
    const existing = await getUser(user.uid);
    if (existing) {
      // returning user — go straight to their dashboard
      navigateByRole(existing.role);
    } else {
      // new user — need to pick role
      setPendingUser(user);
      setView(VIEW.ROLE);
    }
  };

  const navigateByRole = (r) => {
    if (r === "admin") navigate("/admin");
    else navigate("/chef");
  };

  // ── Role selected ──
  const handleRoleSelect = (r) => {
    setRole(r);
    clearError();
    if (r === "admin") setView(VIEW.ADMIN_SETUP);
    else               setView(VIEW.CHEF_CODE);
  };

  // ── Admin setup: create kitchen ──
  const handleAdminSetup = async () => {
    if (!name) { setError("Enter your name."); return; }
    clearError(); setLoading(true);
    try {
      const code = await createKitchen(pendingUser.uid, kitchenName || "My Kitchen");
      await saveUser(pendingUser.uid, {
        name,
        role:      "admin",
        kitchenId: pendingUser.uid,
        email:     pendingUser.email || "",
      });
      navigate("/admin");
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Chef setup: join kitchen by code ──
  const handleChefJoin = async () => {
    if (!name)        { setError("Enter your name."); return; }
    if (!kitchenCode) { setError("Enter your kitchen code."); return; }
    clearError(); setLoading(true);
    try {
      const kitchen = await findKitchenByCode(kitchenCode);
      if (!kitchen) { setError("Invalid kitchen code. Ask your admin."); setLoading(false); return; }

      await addChefToKitchen(kitchen.adminUID, pendingUser.uid);
      await saveUser(pendingUser.uid, {
        name,
        role:      "chef",
        kitchenId: kitchen.adminUID,
        email:     pendingUser.email || "",
      });
      navigate("/chef");
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Email login/signup ──
  const handleEmailSubmit = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    clearError(); setLoading(true);
    try {
      let cred;
      if (isLogin) {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      }
      await handlePostAuth(cred.user);
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Google ──
  const handleGoogle = async () => {
    clearError(); setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await handlePostAuth(cred.user);
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Anonymous ──
  const handleAnonymous = async () => {
    clearError(); setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      // guests go directly to chef view with no kitchen
      await saveUser(cred.user.uid, { name: "Guest", role: "chef", kitchenId: null });
      navigate("/chef");
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Phone ──
  const handleSendOTP = async () => {
    if (!phone) { setError("Enter a phone number."); return; }
    clearError(); setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth, "recaptcha-container", { size: "invisible" }
        );
      }
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmResult(result);
      setView(VIEW.OTP);
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) { setError("Enter the OTP."); return; }
    clearError(); setLoading(true);
    try {
      const cred = await confirmResult.confirm(otp);
      await handlePostAuth(cred.user);
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Shared styles ──
  const optionBtn = {
    width: "100%", padding: "11px 16px",
    border: "1px solid var(--border)", borderRadius: "8px",
    background: "var(--bg-card)", cursor: "pointer", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    fontSize: "0.875rem", fontWeight: "500", color: "var(--text-primary)",
    transition: "box-shadow 0.15s, border-color 0.15s",
  };

  const roleCard = (r, icon, title, desc) => ({
    selected: role === r,
    style: {
      flex: 1, padding: "18px 14px", borderRadius: "10px", cursor: "pointer",
      border: `2px solid ${role === r ? "var(--accent)" : "var(--border)"}`,
      background: role === r ? "var(--accent-light)" : "var(--bg-card)",
      textAlign: "center", transition: "all 0.15s",
    },
  });

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-app)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div id="recaptcha-container"></div>

      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "52px", height: "52px", background: "var(--accent)",
            borderRadius: "14px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.6rem",
            margin: "0 auto 14px", boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
          }}>🍽️</div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "4px" }}>SmartKitchen</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            AI + IoT Kitchen Management
          </p>
        </div>

        <div className="card" style={{ padding: "28px" }}>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "16px" }}>⚠️ {error}</div>
          )}

          {/* ══════════════════════════
              HOME — pick sign in method
          ══════════════════════════ */}
          {view === VIEW.HOME && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Welcome</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Choose how you want to sign in
              </p>

              {/* Google */}
              <button style={optionBtn} onClick={handleGoogle} disabled={loading}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "#4285F4"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>

              {/* Email */}
              <button style={optionBtn} onClick={() => { setView(VIEW.EMAIL); clearError(); }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                ✉️ Continue with Email
              </button>

              {/* Phone */}
              <button style={optionBtn} onClick={() => { setView(VIEW.PHONE); clearError(); }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                📱 Continue with Phone
              </button>

              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                margin: "6px 0 14px", color: "var(--text-muted)", fontSize: "0.78rem",
              }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                or
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              <button className="btn btn-ghost" onClick={handleAnonymous}
                disabled={loading} style={{ width: "100%", fontSize: "0.82rem" }}>
                👤 Continue as Guest
              </button>
            </>
          )}

          {/* ══════════════════════════
              ROLE — admin or chef
          ══════════════════════════ */}
          {view === VIEW.ROLE && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Who are you?</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Choose your role in the kitchen
              </p>

              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                {/* Admin card */}
                <div onClick={() => handleRoleSelect("admin")} style={{
                  flex: 1, padding: "18px 14px", borderRadius: "10px", cursor: "pointer",
                  border: `2px solid ${role === "admin" ? "var(--accent)" : "var(--border)"}`,
                  background: role === "admin" ? "var(--accent-light)" : "var(--bg-card)",
                  textAlign: "center", transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>👨‍💼</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "4px" }}>Admin</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Manage kitchen, stock & recipes</div>
                </div>

                {/* Chef card */}
                <div onClick={() => handleRoleSelect("chef")} style={{
                  flex: 1, padding: "18px 14px", borderRadius: "10px", cursor: "pointer",
                  border: `2px solid ${role === "chef" ? "var(--accent)" : "var(--border)"}`,
                  background: role === "chef" ? "var(--accent-light)" : "var(--bg-card)",
                  textAlign: "center", transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>👨‍🍳</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "4px" }}>Chef</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Join a kitchen with a code</div>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════
              ADMIN SETUP
          ══════════════════════════ */}
          {view === VIEW.ADMIN_SETUP && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Setup your Kitchen</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                A kitchen code will be generated for your chefs
              </p>

              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">Your Name</label>
                <input className="input" placeholder="e.g. Ravi Kumar"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Kitchen Name</label>
                <input className="input" placeholder="e.g. Hotel Saravana Kitchen"
                  value={kitchenName} onChange={e => setKitchenName(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleAdminSetup}
                disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Setting up..." : "Create Kitchen →"}
              </button>
              <button onClick={() => setView(VIEW.ROLE)} className="btn btn-ghost"
                style={{ width: "100%", marginTop: "10px", fontSize: "0.82rem" }}>
                ← Back
              </button>
            </>
          )}

          {/* ══════════════════════════
              CHEF CODE
          ══════════════════════════ */}
          {view === VIEW.CHEF_CODE && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Join a Kitchen</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Ask your admin for the kitchen code
              </p>

              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">Your Name</label>
                <input className="input" placeholder="e.g. Chef Priya"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Kitchen Code</label>
                <input className="input" placeholder="KITCHEN-XXXXXX"
                  value={kitchenCode}
                  onChange={e => setKitchenCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: "0.1em", fontWeight: 600 }} />
              </div>

              <button className="btn btn-primary" onClick={handleChefJoin}
                disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Joining..." : "Join Kitchen →"}
              </button>
              <button onClick={() => setView(VIEW.ROLE)} className="btn btn-ghost"
                style={{ width: "100%", marginTop: "10px", fontSize: "0.82rem" }}>
                ← Back
              </button>
            </>
          )}

          {/* ══════════════════════════
              EMAIL
          ══════════════════════════ */}
          {view === VIEW.EMAIL && (
            <>
              <div style={{
                display: "flex", background: "var(--bg-app)",
                borderRadius: "8px", padding: "4px", marginBottom: "20px",
              }}>
                {["Login", "Sign Up"].map((label, i) => (
                  <button key={label} onClick={() => { setIsLogin(i === 0); clearError(); }} style={{
                    flex: 1, padding: "8px", borderRadius: "6px", border: "none",
                    cursor: "pointer", fontSize: "0.875rem", fontWeight: "500",
                    transition: "all 0.15s",
                    background: (isLogin === (i === 0)) ? "var(--bg-card)" : "transparent",
                    color: (isLogin === (i === 0)) ? "var(--accent)" : "var(--text-muted)",
                    boxShadow: (isLogin === (i === 0)) ? "var(--shadow-sm)" : "none",
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">Email address</label>
                <input className="input" type="email" placeholder="chef@kitchen.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleEmailSubmit()} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Password</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleEmailSubmit()} />
              </div>

              <button className="btn btn-primary" onClick={handleEmailSubmit}
                disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Please wait..." : isLogin ? "Sign In →" : "Create Account →"}
              </button>
              <button onClick={() => setView(VIEW.HOME)} className="btn btn-ghost"
                style={{ width: "100%", marginTop: "10px", fontSize: "0.82rem" }}>
                ← Back
              </button>
            </>
          )}

          {/* ══════════════════════════
              PHONE
          ══════════════════════════ */}
          {view === VIEW.PHONE && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Phone Sign In</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                We'll send an OTP to your number
              </p>
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Phone number (with country code)</label>
                <input className="input" type="tel" placeholder="+91 9876543210"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendOTP()} />
              </div>
              <button className="btn btn-primary" onClick={handleSendOTP}
                disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Sending..." : "Send OTP →"}
              </button>
              <button onClick={() => setView(VIEW.HOME)} className="btn btn-ghost"
                style={{ width: "100%", marginTop: "10px", fontSize: "0.82rem" }}>
                ← Back
              </button>
            </>
          )}

          {/* ══════════════════════════
              OTP
          ══════════════════════════ */}
          {view === VIEW.OTP && (
            <>
              <h2 style={{ marginBottom: "4px", fontSize: "1.1rem" }}>Enter OTP</h2>
              <p style={{ marginBottom: "20px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Sent to {phone}
              </p>
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">6-digit OTP</label>
                <input className="input" type="number" placeholder="123456"
                  value={otp} onChange={e => setOtp(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleVerifyOTP()} />
              </div>
              <button className="btn btn-primary" onClick={handleVerifyOTP}
                disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Verifying..." : "Verify & Sign In →"}
              </button>
              <button onClick={() => setView(VIEW.PHONE)} className="btn btn-ghost"
                style={{ width: "100%", marginTop: "10px", fontSize: "0.82rem" }}>
                ← Change Number
              </button>
            </>
          )}

        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Smart Kitchen Management System v1.0
        </p>

      </div>
    </div>
  );
}

export default Auth;