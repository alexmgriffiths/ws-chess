import { useState, useEffect, useContext } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Piece, Square } from "react-chessboard/dist/chessboard/types";
import { GamePlayer, GameChat, GameHistoryNavigator, GameHistory, GameOverModal } from "../components/Game";
import { initGameSocket } from "../services/socket";
import { AuthContext } from "../AuthContext";
import { WaitingForOpponent } from "./WaitingForOpponent";
import { Button } from "../components";

function App() {
  
  const [socket, setSocket]: any = useState();
  const { authToken } = useContext(AuthContext);

  const [user, setUser]: any = useState();
  const [gameId, setGameId]: any = useState();
  const [gameChat, setGameChat]: any = useState([]);

  const [serverError, setServerError]: any = useState("");

  const [opponent, setOpponent]: any = useState("");
  const [gameReady, setGameReady]: any = useState(false);
  const [playerColor, setPlayerColor]: any = useState("white");
  const [game, setGame] = useState(new Chess());
  const [inCheck, setInCheck] = useState(false);

  const [gameHistoryIndex, setGameHistoryIndex] = useState(0);
  const [gameFenHistory, setGameFenHistory] = useState([new Chess().fen()]);
  const [gameMoveHistory, setGameMoveHistory]: any = useState([]);

  const [gameComment, setGameComment] = useState("");
  const [moveFrom, setMoveFrom] = useState("");

  const [highlightedMoveHistory, setHighlightedMoveHistory] = useState({});
  const [squareOptions, setSquareOptions] = useState({});
  const [rightClickedSquares, setRightClickedSquares]: any = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameOverType, setGameOverType] = useState("");
  const [gameResult, setGameResult] = useState("");
  const [newElo, setNewElo] = useState(0);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const tempGameId = params.get("gameId") ?? Math.floor(Math.random() * 100000);
    const againstAI = params.get("AI") ?? false;

    setGameId(tempGameId);
    initGameSocket(
      authToken, 
      tempGameId, 
      againstAI,
      setGameComment,
      setSquareOptions,
      setMoveFrom,
      setGame,
      setGameFenHistory,
      setGameMoveHistory,
      setGameHistoryIndex,
      setServerError,
      setPlayerColor,
      setOpponent,
      setUser,
      setGameChat,
      setGameReady,
      setInCheck,
      handleGameOver,
      setSocket
    );
  }, [authToken]);

  useEffect(() => {
    const newSquares: any = {};
    if(gameMoveHistory && gameMoveHistory.length > 0) {
      const newest = gameMoveHistory[gameHistoryIndex - 1];
      if(newest) {
        newSquares[newest.from] = { background: "rgba(255, 255, 0, 0.4)" }
        newSquares[newest.to] = { background: "rgba(255, 255, 0, 0.4)" }
      }
    }

    if(inCheck !== false) {
      game.board().forEach((row) => {
        row.forEach((piece: any) => {
          if (piece && piece.type === "k" && piece.color === inCheck) {
            newSquares[piece.square] = { background: 'rgba(255, 0, 0, 0.4)' };
          };
        });
      });
    }

    setHighlightedMoveHistory(newSquares);
  }, [gameMoveHistory, gameHistoryIndex, inCheck, game]);


  
  const handleGameOver = (type: string, elo: number, result: string) => {
    setGameResult(result);
    setGameOverType(type);
    setNewElo(elo);
    setIsModalOpen(true);
  }

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

  const makeMove = (
    from: Square,
    to: Square,
  ) => {
    try {
      const serverMessage = JSON.stringify({
        type: "MOVE",
        data: { from, to, gameId, user: authToken },
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
      makeMove(source, target);
      setMoveFrom("");
      setSquareOptions({});
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const handleRematch = () => {
    alert("Coming soon!");
  }

  const resign = () => {
    const serverMessage = JSON.stringify({type: "RESIGN", data: { gameId }});
    socket.send(serverMessage);
  }

  if (serverError.length > 0) {
    return <h1>Server Error: {serverError}</h1>;
  }

  if (!gameReady) {
    return <WaitingForOpponent gameId={gameId} />;
  }

  return (
    <div id="page">
      <div id="chessContent">
        <div id="chessboard">
          <GamePlayer username={opponent.username} elo={opponent.elo} />
          <div id="chessContainer">
            <GameOverModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={gameResult} endType={gameOverType} elo={user.elo} newElo={newElo} handleRematch={handleRematch} handleNewGame={handleRematch}/>
            <Chessboard
              position={game.fen()}
              arePiecesDraggable={true}
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
                ...highlightedMoveHistory
              }}
              boardOrientation={playerColor}
            />
          </div>
          <GamePlayer username={user.username} elo={user.elo} />
        </div>
        <div id="rightSide">
          <GameHistory gameComment={gameComment} gameFenHistory={gameFenHistory} />
          <GameHistoryNavigator gameHistoryIndex={gameHistoryIndex} setGameHistoryIndex={setGameHistoryIndex} gameFenHistory={gameFenHistory} game={game} />
          <Button onClick={resign}>Resign</Button>
          <GameChat gameChat={gameChat} gameId={gameId} socket={socket} />
        </div>
      </div>
    </div>
  );
}

export default App;
