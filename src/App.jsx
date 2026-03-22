import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./services/useAuth";

// Layouts
import AdminLayout from "./components/AdminLayout";
import ChefLayout  from "./components/ChefLayout";

// Auth
import Auth from "./pages/Auth";

// Admin pages
import AdminDashboard  from "./pages/admin/AdminDashboard";
import AdminStock      from "./pages/admin/AdminStock";
import AdminRecipes    from "./pages/admin/AdminRecipes";
import AdminChefs      from "./pages/admin/AdminChefs";
import AdminLogs       from "./pages/admin/AdminLogs";
import AdminSettings   from "./pages/admin/AdminSettings";

// Chef pages
import ChefDashboard from "./pages/chef/ChefDashboard";
import ChefCook      from "./pages/chef/ChefCook";
import ChefLogs      from "./pages/chef/ChefLogs";

// Loading screen
function Loading() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-app)", gap: "12px",
    }}>
      <div style={{
        width: "44px", height: "44px", background: "var(--accent)",
        borderRadius: "12px", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "1.4rem",
        animation: "pulse 1.5s ease-in-out infinite",
      }}>🍽️</div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading SmartKitchen...</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Loading />;

  // Decide default redirect based on role
const defaultRoute = !user
    ? "/auth"
    : !profile
    ? "/auth"
    : profile.role === "admin"
    ? "/admin"
    : "/chef";

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Auth ── */}
        <Route
          path="/auth"
          element={!user || !profile ? <Auth /> : <Navigate to={defaultRoute} />}
        />

        {/* ── Admin routes ── */}
        <Route path="/admin" element={
          user && profile?.role === "admin"
            ? <AdminLayout profile={profile} />
            : <Navigate to={defaultRoute} />
        }>
          <Route index          element={<AdminDashboard />} />
          <Route path="stock"   element={<AdminStock />} />
          <Route path="recipes" element={<AdminRecipes />} />
          <Route path="chefs"   element={<AdminChefs />} />
          <Route path="logs"    element={<AdminLogs />} />
          <Route path="settings"element={<AdminSettings />} />
        </Route>

        {/* ── Chef routes ── */}
        <Route path="/chef" element={
          user && profile?.role
            ? <ChefLayout profile={profile} />
            : <Navigate to={defaultRoute} />
        }>
          <Route index       element={<ChefDashboard />} />
          <Route path="cook" element={<ChefCook />} />
          <Route path="logs" element={<ChefLogs />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={defaultRoute} />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;