import { useState, useContext } from "react";
import { AuthContext } from "../AuthContext";
import Cookies from "js-cookie";

export default function Register() {
  const { setAuthToken } = useContext(AuthContext);
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
    } else {
      const data = await response.json();
      console.log(data);
      alert(data.data.error);
    }
  };

  return (
    <>
      <h1>Register</h1>
      <input
        type="text"
        placeholder="Email"
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <br />
      <input
        type="text"
        placeholder="Username"
        onChange={(e) => {
          setUsername(e.target.value);
        }}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />
      <br />
      <input
        type="password"
        placeholder="Confirm Password"
        onChange={(e) => {
          setConfirmPassword(e.target.value);
        }}
      />
      <br />
      <button onClick={register}>Register</button>
    </>
  );
}
