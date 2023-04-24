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

        const socketConnection: WebSocket = new WebSocket(process.env.REACT_APP_WS_URL as string);
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

    const createGame = () => {
        setNavigateToGame(true);
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
            Game Code:
            <input type="text" placeholder="XYZ123456" onChange={(e) => {setGameCode(e.target.value)}} value={gameCode}/>
            <button onClick={createGame}>Join Game</button><br />
            Token: {authToken}
            <button onClick={logout}>Logout</button>
        </>
    )
}