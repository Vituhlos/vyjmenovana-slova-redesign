import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.layout}>
      <Outlet />
    </div>
  );
}

export function RequireParent() {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role !== "parent") return <Navigate to="/quiz" replace />;

  return <Outlet />;
}
