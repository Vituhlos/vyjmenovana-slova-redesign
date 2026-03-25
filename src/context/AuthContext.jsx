import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getUsers } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("vs_user"));
    } catch {
      return null;
    }
  });
  const [users, setUsers] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser === null) loadUsers();
  }, [currentUser, loadUsers]);

  const loginUser = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem("vs_user", JSON.stringify(user));
  };

  const logoutUser = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("vs_user");
  };

  const refreshCurrentUser = (updated) => {
    setCurrentUser(updated);
    sessionStorage.setItem("vs_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, users, loadUsers, loginUser, logoutUser, refreshCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
