import { Chess } from "chess.js";

export const initGameSocket = async (
    token: string, 
    gameId: string | number, 
    againstAI: string | boolean,
    setGameComment: React.Dispatch<React.SetStateAction<string>>,
    setSquareOptions: React.Dispatch<React.SetStateAction<{}>>,
    setMoveFrom: React.Dispatch<React.SetStateAction<string>>,
    setGame: React.Dispatch<React.SetStateAction<Chess>>,
    setGameFenHistory: React.Dispatch<React.SetStateAction<string[]>>,
    setGameHistoryIndex: React.Dispatch<React.SetStateAction<number>>,
    setServerError: React.Dispatch<React.SetStateAction<string>>,
    setPlayerColor: React.Dispatch<React.SetStateAction<string>>,
    setOpponent: React.Dispatch<React.SetStateAction<{}>>,
    setUser: React.Dispatch<React.SetStateAction<{}>>,
    setGameChat: React.Dispatch<React.SetStateAction<{}>>,
    setGameReady: React.Dispatch<React.SetStateAction<boolean>>,
    handleGameOver: any,
    socketConnectionCallback: any
    ) => {
    const socketConnection: WebSocket = new WebSocket(
        process.env.REACT_APP_WS_URL as string
    );
    socketConnectionCallback(socketConnection);
    socketConnection.onopen = (e: any) => {
        const serverPingMessage = JSON.stringify({ type: "PING" });
        socketConnection.send(serverPingMessage);
        const serverMessage = JSON.stringify({
            type: "START",
            data: {
            user: token,
            gameId: gameId,
            againstAI,
            },
        });
        socketConnection.send(serverMessage);
        };
        socketConnection.onmessage = (event: any) => {
        const data = JSON.parse(event.data as unknown as string);
        console.log(data, event);
        switch (data.type) {
            case "PONG":
                console.log("PONG");
            // Set last time server was ponged, later, check if server was ponged long time ago, then try to re-connect
            break;
            case "UPDATE":
            console.log(data);

            const { pgn, history, comment } = data;
            const gameCopy = new Chess();
            gameCopy.loadPgn(pgn);
            if (comment && comment.length > 0) {
                setGameComment(comment);
            }
            setSquareOptions({});
            setMoveFrom("");
            setGame(gameCopy);
            setGameFenHistory(history);

            const newGameHistoryIndex = history.length - 1;
            setGameHistoryIndex(newGameHistoryIndex);

            break;
            case "ERROR":
            const { error } = data;
            setServerError(error);
            break;
            case "INVALID":
            console.log(data);
            break;
            case "INIT":
            const { color } = data;
            setPlayerColor(color);
            break;
            case "START":
            const { opponent } = data;
            setOpponent(opponent);
            setUser(data.user);
            setGameChat(data.chat);
            setGameReady(true);
            break;
            case "GAMEEVENT":
            const { event, eventData } = data;
            const { elo, result } = eventData;
            if(event === "CHECKMATE") {
                handleGameOver("Checkmate", elo, result);
                return;
            }
    
            break;
            case "CHATUPDATE":
            const { gameChat } = data;
            setGameChat(gameChat);
            break;
        }
        };
    setInterval(() => {
    const serverPingMessage = JSON.stringify({ type: "PING" });
        socketConnection.send(serverPingMessage);
    }, 5000);
}