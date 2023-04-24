import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Link, Navigate } from 'react-router-dom';

export default function Login() {

    const [authToken, setAuthToken] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [navigate, setNavigate] = useState(false);

    const login = async () => {
        const response = await fetch(process.env.REACT_APP_API_URL + '/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            const data = await response.json();
            // Set the token cookie
            Cookies.set('token', data.data.token, { secure: true, sameSite: 'none' });
            setAuthToken(data.data.token);
        } else {
            // Handle the login error
            alert("Login failed");
        }
    }

    if(navigate) {
        <Navigate to={"/"} />
    }

    return (
        <>
            <input type="text" placeholder="Username / Email" onChange={(e) => {setUsername(e.target.value)}}/>
            <input type="password" placeholder="Password" onChange={(e) => {setPassword(e.target.value)}}/>
            <button onClick={login}>Login</button>
            <br />
            <Link to={"/register"}>Register</Link>
        </>
    )
}