import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';


export default function Home(props: any) {

    const [name, setName] = useState("");
    const [gameCode, setGameCode] = useState("");
    const [socket, setSocket]: any = useState();
    const [navigateToGame, setNavigateToGame] = useState(false);

    useEffect(() => {
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

    return (
        <>
            {navigateToGame && (
                <Navigate to={`/game?gameId=${gameCode}&userId=${name}`} />
            )}
            <h1>Home!</h1>
            Your Name:
            <input type="text" placeholder="John Doe" onChange={(e) => {setName(e.target.value)}}/><br/>
            Game Code:
            <input type="text" placeholder="XYZ123456" onChange={(e) => {setGameCode(e.target.value)}}/><br />
            <button onClick={createGame}>Join Game</button>
        </>
    )
}