import ReactDOM from "react-dom/client";
import "./index.css";
import { Router } from "./Router";
import { AuthProvider } from "./AuthContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <AuthProvider>
    <Router />
  </AuthProvider>
);
