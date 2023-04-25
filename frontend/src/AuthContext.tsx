import { useState, useEffect, createContext } from "react";
import Cookies from "js-cookie";

export function AuthProvider(props: any) {
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    const cookieToken = Cookies.get("token");
    if (cookieToken) {
      setAuthToken(cookieToken);
    }
  }, []);

  // Validate session / token with backend
  useEffect(() => {
    async function validateToken() {}
    validateToken();
  }, [authToken]);

  return (
    <AuthContext.Provider value={{ authToken, setAuthToken }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export const AuthContext = createContext({
  authToken: "",
  setAuthToken: (value: string) => {},
});
