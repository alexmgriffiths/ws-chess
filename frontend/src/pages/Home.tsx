import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function Home(props: any) {

    const [authToken, setAuthToken] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [gameCode, setGameCode] = useState("");
    const [socket, setSocket]: any = useState();
    const [navigateToGame, setNavigateToGame] = useState(false);

    useEffect(() => {

        const cookieToken = Cookies.get("token");
        if(cookieToken) {
            setAuthToken(cookieToken);
        }

        const socketConnection: WebSocket = new WebSocket("ws://localhost:8080");
        socketConnection.onmessage = (event: any) => {
            const data = JSON.parse(event.data as unknown as string);
            switch(data.type) {
                case "SEARCHRESULT":
                const { result } = data;
                if(result === "FOUND") {
                    alert("GAME FOUND");
                } else {
                    alert("Game code not found!");
                }
                break;
            }
        }
        setSocket(socketConnection);
    }, []);

    const findGame = () => {
        socket.send(JSON.stringify({type: "SEARCHGAMECODE", code: gameCode}));
    }

    const createGame = () => {
        setNavigateToGame(true);
    }

    const login = async () => {
        const response = await fetch('http://localhost:3001/api/users/login', {
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

    const logout = () => {
        Cookies.remove('token', { secure: true, sameSite: "none" });
        setAuthToken("")
    }

    return (
        <>
            {navigateToGame && (
                <Navigate to={`/game?gameId=${gameCode}`} />
            )}
            <h1>Home!</h1>
            {authToken.length !== 0 ? (
                <>
                    Game Code:
                    <input type="text" placeholder="XYZ123456" onChange={(e) => {setGameCode(e.target.value)}} value={gameCode}/>
                    <button onClick={createGame}>Join Game</button><br />
                    Token: {authToken}
                    <button onClick={logout}>Logout</button>
                </>
            ) : (
                <>
                    <input type="text" placeholder="Username / Email" onChange={(e) => {setUsername(e.target.value)}}/>
                    <input type="password" placeholder="Password" onChange={(e) => {setPassword(e.target.value)}}/>
                    <button onClick={login}>Login</button>
                </>
            )}
        </>
    )
}