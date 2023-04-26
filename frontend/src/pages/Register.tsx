import { useState, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { Button, Input } from "../components";

export default function Register() {
  const { setAuthToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const register = async () => {
    if (password !== confirmPassword) {
      alert("The passwords must match!");
      return;
    }

    const response = await fetch(
      process.env.REACT_APP_API_URL + "/users/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username, password }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      Cookies.set("token", data.data.token, { secure: true, sameSite: "none" });
      setAuthToken(data.data.token);
      navigate("/");
    } else {
      const data = await response.json();
      console.log(data);
      alert(data.data.error);
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
        <h2>Sign Up</h2>
        <Input placeholder="Email" onChange={setEmail} />
        <Input placeholder="Username" onChange={setUsername} />
        <Input type="password" placeholder="Password" onChange={setPassword} />
        <Input
          type="password"
          placeholder="Password"
          onChange={setConfirmPassword}
        />
        <Button onClick={register}>Register</Button>
        <div>
          <Link to={"/login"} style={{ float: "right", color: "white" }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
