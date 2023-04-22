import { useState, useEffect, } from "react";
import { Chess } from "chess.js";
import { Chessboard } from 'react-chessboard';
import { Piece, Square } from "react-chessboard/dist/chessboard/types";

function App(props: any) {
  const [socket, setSocket]: any = useState();
  const [userId, setUserId]: any = useState();
  const [gameId, setGameId]: any = useState();

  const [serverMessages, setServerMessages]: any = useState([]);

  const [opponent, setOpponent]: any = useState("");
  const [gameReady, setGameReady]: any = useState(false);
  const [playerColor, setPlayerColor]: any = useState("white");
  const [game, setGame] = useState(new Chess());
  const [gameComment, setGameComment] = useState("");
  const [moveFrom, setMoveFrom] = useState("");
  const [squareOptions, setSquareOptions] = useState({});
  const [rightClickedSquares, setRightClickedSquares]: any = useState();

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const tempGameId = params.get('gameId') ?? Math.floor(Math.random() * 100000);
    const tempUserId = params.get("userId") ?? Math.floor(Math.random() * 10000);
    setUserId(tempUserId);
    setGameId(tempGameId);

    const socketConnection: WebSocket = new WebSocket("ws://localhost:8080");
    socketConnection.onopen = (e: any) => {
      const serverPingMessage = JSON.stringify({type: "PING"});
      socketConnection.send(serverPingMessage);
      const serverMessage = JSON.stringify({type: "START", data: {
        userId: tempUserId,
        gameId: tempGameId
      }});
      socketConnection.send(serverMessage);
    }
    socketConnection.onmessage = (event: any) => {
      const data = JSON.parse(event.data as unknown as string);
      switch(data.type) {
        case "PONG":
          console.log("PONG event handled");
        break;
        case "UPDATE":
          const { pgn, comment } = data;
          const gameCopy = new Chess();
          gameCopy.loadPgn(pgn);
          setGameComment(comment);
          setGame(gameCopy);
        break;
        case "ERROR":
          const { error } = data;
          console.log(error);
        break;
        case "MESSAGE":
          const { message } = data;
          const serverMessagesCopy = serverMessages;
          serverMessagesCopy.push(message);
          setServerMessages(serverMessagesCopy);
        break;
        case "INIT":
          const { color } = data;
          setPlayerColor(color);
        break;
        case "START":
          const { opponent } = data;
          setOpponent(opponent);
          game.header(opponent);
          setGameReady(true);
        break;
      }
    }
    setSocket(socketConnection);
  }, []);

  useEffect(() => {
    if(game.isCheckmate()) {
      alert("Get shit on");
    }
  }, [game]);

  const pieces = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"];
  const customPieces = () => {
    const returnPieces: any = {};
    pieces.map((p) => {
      returnPieces[p] = ({ squareWidth }: any) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            backgroundImage: `url(/pieces/${p}.png)`,
            backgroundSize: "100%",
          }}
        />
      );
      return null;
    });
    return returnPieces;
  };

  const makeMove = (from: Square, to: Square, piece: Piece = "wP", promotion: string = "q") => {
    try {
      const serverMessage = JSON.stringify({type: "MOVE", data: { from, to, gameId, userId }});
      socket.send(serverMessage);
      return true;
    } catch (e: any) {
      return false;
    }
  }

  const getMoveOptions = (square: Square) => {
    const moves = game.moves({square, verbose: true});
    if(moves.length === 0) {
      return false;
    }

    if(game.get(square).color !== playerColor.substring(0, 1)) {
      return false;
    }

    const newSquares: any = {};
    moves.map((move: any) => {
      newSquares[move.to] = {
        background: game.get(move.to) && game.get(move.to).color !== game.get(square).color
        ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
        : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });

    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    }
    setSquareOptions(newSquares);
    return true;
  }

  const onSquareClick = (square: Square) => {
    setRightClickedSquares({});

    function resetFirstMove(square: Square) {
      const hasOptions = getMoveOptions(square);
      if(hasOptions) setMoveFrom(square);
    }

    if(!moveFrom) {
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

  }

  const onSquareRightClick = (square: Square) => {
    const colour = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
        rightClickedSquares[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    });
  }

  const onPieceDrag = (piece: Piece, square: Square) => {
    const hasOptions = getMoveOptions(square);
    if(hasOptions) setMoveFrom(square);
  }

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
  }

  if(!gameReady) {
    return (
      <>
        <h1>Waiting for opponent...</h1>
        <h3>Game ID: {gameId}</h3>
      </>
    )
  }

  return (
    <div id="page">
      <Chessboard 
        boardWidth={720} 
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
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        customPieces={customPieces()}
        customSquareStyles={{
          ...squareOptions,
          ...rightClickedSquares,
        }}
        boardOrientation={playerColor}
      />
      <h3>Comment: {gameComment}</h3>
      <h1>User Id: {userId}</h1>
      <h1>Opponent Id: {opponent}</h1>
      <h1>Game ID: {gameId}</h1>
      <h3>FEN: {game.fen()}</h3>
      {game.pgn()}
    </div>
  )
}

export default App;