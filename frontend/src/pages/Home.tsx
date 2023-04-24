import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function Home(_props: any) {

    const [authToken, setAuthToken] = useState("");

    const [gameCode, setGameCode] = useState("");
    const [navigateToGame, setNavigateToGame] = useState(false);

    useEffect(() => {
        const cookieToken = Cookies.get("token");
        if(cookieToken) {
            setAuthToken(cookieToken);
        }
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