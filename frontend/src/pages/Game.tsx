import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Piece, Square } from "react-chessboard/dist/chessboard/types";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

function App() {
  const [socket, setSocket]: any = useState();
  const [token, setToken]: any = useState();
  const [user, setUser]: any = useState();
  const [gameId, setGameId]: any = useState();
  const [chatMessage, setChatMessage]: any = useState("");
  const [gameChat, setGameChat]: any = useState([]);

  const [serverError, setServerError]: any = useState("");

  const [opponent, setOpponent]: any = useState("");
  const [gameReady, setGameReady]: any = useState(false);
  const [playerColor, setPlayerColor]: any = useState("white");
  const [game, setGame] = useState(new Chess());
  const [gameComment, setGameComment] = useState("");
  const [moveFrom, setMoveFrom] = useState("");
  const [squareOptions, setSquareOptions] = useState({});
  const [rightClickedSquares, setRightClickedSquares]: any = useState({});

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const tempGameId =
      params.get("gameId") ?? Math.floor(Math.random() * 100000);
    const tempToken = Cookies.get("token") ?? "none";
    setToken(tempToken);
    setGameId(tempGameId);

    const socketConnection: WebSocket = new WebSocket(
      process.env.REACT_APP_WS_URL as string
    );
    socketConnection.onopen = (e: any) => {
      const serverPingMessage = JSON.stringify({ type: "PING" });
      socketConnection.send(serverPingMessage);
      const serverMessage = JSON.stringify({
        type: "START",
        data: {
          user: tempToken,
          gameId: tempGameId,
          againstAI: false,
        },
      });
      socketConnection.send(serverMessage);
    };
    socketConnection.onmessage = (event: any) => {
      const data = JSON.parse(event.data as unknown as string);
      switch (data.type) {
        case "PONG":
          // Set last time server was ponged, later, check if server was ponged long time ago, then try to re-connect
          break;
        case "UPDATE":
          const { pgn, comment } = data;
          const gameCopy = new Chess();
          gameCopy.loadPgn(pgn);
          if (comment && comment.length > 0) {
            setGameComment(comment);
          }
          setSquareOptions({});
          setMoveFrom("");
          setGame(gameCopy);
          break;
        case "ERROR":
          const { error } = data;
          setServerError(error);
          break;
        case "INVALID":
          console.log(data.error);
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
          const { event } = data;
          console.log(event);
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
    setSocket(socketConnection);
  }, []);

  //const pieces = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"];

  // const customPieces = () => {
  //   const returnPieces: any = {};
  //   pieces.map((p) => {
  //     returnPieces[p] = ({ squareWidth }: any) => (
  //       <div
  //         style={{
  //           width: squareWidth,
  //           height: squareWidth,
  //           backgroundImage: `url(/pieces/${p}.png)`,
  //           backgroundSize: "100%",
  //         }}
  //       />
  //     );
  //     return null;
  //   });
  //   return returnPieces;
  // };

  const makeMove = (
    from: Square,
    to: Square,
    piece: Piece = "wP",
    promotion: string = "q"
  ) => {
    try {
      const serverMessage = JSON.stringify({
        type: "MOVE",
        data: { from, to, gameId, user: token },
      });
      socket.send(serverMessage);
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const getMoveOptions = (square: Square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      return false;
    }

    if (game.get(square).color !== playerColor.substring(0, 1)) {
      return false;
    }

    const newSquares: any = {};
    moves.map((move: any) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });

    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setSquareOptions(newSquares);
    return true;
  };

  const onSquareClick = (square: Square) => {
    setRightClickedSquares({});

    function resetFirstMove(square: Square) {
      const hasOptions = getMoveOptions(square);
      if (hasOptions) setMoveFrom(square);
    }

    if (!moveFrom) {
      resetFirstMove(square);
      return;
    }

    try {
      makeMove(moveFrom as Square, square);
      setMoveFrom("");
      setSquareOptions({});
      return true;
    } catch (e: any) {
      resetFirstMove(square);
      return;
    }
  };

  const onSquareRightClick = (square: Square) => {
    const color = "rgba(255, 0, 0, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
        rightClickedSquares[square].backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    });
  };

  const onPieceDrag = (piece: Piece, square: Square) => {
    const hasOptions = getMoveOptions(square);
    if (hasOptions) setMoveFrom(square);
  };

  const onPieceDragEnd = (source: Square, target: Square, piece: Piece) => {
    setRightClickedSquares({});
    setMoveFrom("");
    try {
      makeMove(source, target, piece);
      setMoveFrom("");
      setSquareOptions({});
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const resign = () => {
    const serverMessage = JSON.stringify({ type: "RESET", data: { gameId } });
    socket.send(serverMessage);
    setGameComment("");
  };

  const sendMessage = () => {
    const serverMessage = JSON.stringify({
      type: "CHAT",
      data: { message: chatMessage, gameId },
    });
    socket.send(serverMessage);
    setChatMessage("");
  };

  const chatKeyDown = ({ key }: any) => {
    if (key === "Enter") {
      sendMessage();
    }
  };

  if (token === "none") {
    return (
      <>
        <Navigate to={"/"} />
      </>
    );
  }

  if (serverError.length > 0) {
    return <h1>Server Error: {serverError}</h1>;
  }

  if (!gameReady) {
    return (
      <>
        <h1>Waiting for opponent...</h1>
        <h3>Game ID: {gameId}</h3>
      </>
    );
  }

  return (
    <div id="page">
      <div id="chessContent">
        <div id="chessboard">
          <div className="playerContainer">
            <div className="nameContainer">{opponent.username}</div>
            <div className="eloContainer">({opponent.elo})</div>
          </div>
          <div id="chessContainer">
            <Chessboard
              boardWidth={620}
              position={game.fen()}
              arePiecesDraggable={false}
              onPieceDragBegin={onPieceDrag}
              onPieceDrop={onPieceDragEnd}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
              customBoardStyle={{
                borderRadius: "4px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
              }}
              // customDarkSquareStyle={{ backgroundColor: "#779952" }}
              // customLightSquareStyle={{ backgroundColor: "#edeed1" }}
              // customPieces={customPieces()}
              customSquareStyles={{
                ...squareOptions,
                ...rightClickedSquares,
              }}
              boardOrientation={playerColor}
            />
          </div>
          <div className="playerContainer">
            <div className="nameContainer">{user.username}</div>
            <div className="eloContainer">({user.elo})</div>
          </div>
        </div>
        <div id="rightSide">
          <div id="history">
            <h3>{gameComment}</h3>
            {game.history().map((move, index) => (
              <>
                <span key={index}>{move}</span>
                <br />
              </>
            ))}
          </div>
          <div id="history">
            {gameChat &&
              gameChat.map((chat: any, index: number) => (
                <div key={index}>
                  <span>
                    {chat.username} ({chat.timestamp}): {chat.message}
                  </span>
                  <br />
                </div>
              ))}
            <input
              type="text"
              placeholder="Chat Message"
              onChange={(e) => {
                setChatMessage(e.target.value);
              }}
              value={chatMessage}
              onKeyDown={chatKeyDown}
            />
          </div>
        </div>
      </div>
      <div id="actionsContainer">
        <button onClick={resign}>Resign</button>
      </div>
    </div>
  );
}

export default App;
