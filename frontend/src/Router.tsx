import { useContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game from "./pages/Game";
import { AuthContext } from "./AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

export function Router() {
  const { authToken } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {authToken.length > 0 ? (
          <Route path="/">
            <Route index element={<Home />} />
            <Route path="/game" element={<Game />} />
          </Route>
        ) : (
          <Route path="/">
            <Route index element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
