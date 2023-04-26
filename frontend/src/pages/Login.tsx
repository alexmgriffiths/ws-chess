import { useState, useContext } from "react";
import { AuthContext } from "../AuthContext";
import Cookies from "js-cookie";
import { Link } from "react-router-dom";
import { Button, Input } from "../components";

export default function Login() {
  const { setAuthToken } = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const response = await fetch(
      process.env.REACT_APP_API_URL + "/users/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      // Set the token cookie
      Cookies.set("token", data.data.token, { secure: true, sameSite: "none" });
      setAuthToken(data.data.token);
    } else {
      // Handle the login error
      alert("Login failed");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "20%",
          gap: "10px",
          margin: "10% auto",
        }}
      >
        <h2>Account Login</h2>
        <Input placeholder="Username / Email" onChange={setUsername} />
        <Input type="password" placeholder="Password" onChange={setPassword} />
        <Button onClick={login}>Login</Button>
        <div>
          <Link to={"/register"} style={{ float: "right", color: 'white' }}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
