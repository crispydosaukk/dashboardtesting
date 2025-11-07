import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login/index.jsx";
import Dashboard from "./components/dashboard/dashboard.jsx";
import AccessManagement from "./pages/access/index.jsx";
import Roles from "./pages/roles/index.jsx";
import Users from "./pages/users/index.jsx";
import Restuarent from "./pages/restuarent/index.jsx";      // ← NEW
import ManualOrders from "./pages/manual-orders/index.jsx"; // ← NEW
import RequirePerm from "./components/RequirePerm.jsx";
import Category from "./pages/category/index.jsx";
import Product from "./pages/product/index.jsx";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <RequirePerm perm="dashboard"><Dashboard /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/manual-orders"
          element={
            <PrivateRoute>
              <RequirePerm perm="order_management"><ManualOrders /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/restuarent"
          element={
            <PrivateRoute>
              <RequirePerm perm="restaurant"><Restuarent /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/access"
          element={
            <PrivateRoute>
              <RequirePerm perm="access"><AccessManagement /></RequirePerm>
            </PrivateRoute>
          }
        />
        <Route
          path="/access/roles"
          element={
            <PrivateRoute>
              <RequirePerm perm="access"><Roles /></RequirePerm>
            </PrivateRoute>
          }
        />
        <Route
          path="/access/users"
          element={
            <PrivateRoute>
              <RequirePerm perm="access"><Users /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/category"
          element={
            <PrivateRoute>
              <RequirePerm perm="category"><Category /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/product"
          element={
            <PrivateRoute>
              <RequirePerm perm="product"><Product /></RequirePerm>
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
