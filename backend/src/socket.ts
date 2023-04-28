import { config } from 'dotenv';
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "https";
import { readFileSync } from "fs";
import { Chess } from "chess.js";
import { GameConnection } from "./models/GameConnection";
import { parsePGNFile } from "./helpers/PGNHelper";
import { User } from "./models/User";
import UsersService from "./services/userService";
import { Stockfish } from "./stockfish";
import { ChatMessage } from "./models/ChatMessage";
import { calculateEloRating, GameResult } from "./helpers/ratingHelper";

config();
const openings: any = parsePGNFile("eco.pgn");
const games = new Map<string, GameConnection>();
const usersService = new UsersService();

export function setupSocket() {
  const wss = createSocketServer();
  wss.on("connection", handleConnection);
  console.log("WEBSOCKET LISTENING ON PORT ", process.env.WS_PORT);
}

function createSocketServer(): WebSocketServer {
  if (process.env.ENV !== "dev") {
    const server = createServer({
      cert: readFileSync(process.env.CERT_PATH as string),
      key: readFileSync(process.env.CERT_KEY as string),
    });
    server.listen(process.env.WS_PORT);

    return new WebSocketServer({
      server,
    });
  } else {
    return new WebSocketServer({
      port: 8080,
    });
  }
}

function handleConnection(ws: WebSocket) {
  ws.on("error", console.error);
  ws.on("message", (data: any) => handleMessage(ws, data));
}

function handleMessage(socket: WebSocket, data: any) {
  const event = JSON.parse(data as string);
  const eventHandler = events[event.type];
  if (!eventHandler) {
    socket.send(JSON.stringify({ type: "PONG" }));
    console.error("UNHANDLED EVENT ", event.type);
    return;
  }
  eventHandler(socket, event.data);
}

const events: { [key: string]: (socket: WebSocket, data: any) => void } = {
  PING: (socket: WebSocket, _data: any) => {
    send(socket, { type: "PONG" });
  },
  START: (socket: WebSocket, data: any) => {
    handleStart(socket, data);
  },
  MOVE: (socket: WebSocket, data: any) => {
    handleMove(socket, data);
  },
  RESET: (socket: WebSocket, data: any) => {
    handleReset(socket, data);
  },
  CHAT: (socket: WebSocket, data: any) => {
    handleChat(socket, data);
  },
};

function send(socket: WebSocket, message: any) {
  const clientMessage = JSON.stringify(message);
  socket.send(clientMessage);
}

async function handleStart(socket: WebSocket, data: any) {
  const { user, gameId, againstAI } = data;

  // Game ID not found, make a new one
  if (games.get(gameId) === undefined) {
    const newGame = await createNewGame(gameId, user, againstAI, socket);

    // If against AI start the game
    if (againstAI) {
      games.set(gameId, {...newGame, stockfish: new Stockfish()});
      send(socket, { type: "UPDATE", pgn: "", history: [newGame.game.fen()] });
      send(socket, {
        type: "START",
        opponent: { session: "", userId: 0, username: "AI", elo: 3500 },
        user: newGame.white.user,
        chat: [],
      });
    }
    return;
  }

  // Game ID found, lets retrieve it from memory
  const currentGame = games.get(gameId);

  // Handle window reload of AI game
  // TODO: Allow user to play as white or black
  if (currentGame?.againstAI) {
    if (currentGame.white.user.session === user) {
      games.set(gameId, {...currentGame, white: {...currentGame!.white, socket}});
      send(socket, { type: "INIT", color: "white" });
      send(socket, { type: "UPDATE", pgn: currentGame.game.pgn(), history: currentGame.history, comment: currentGame.comment });
      send(socket, {
        type: "START",
        opponent: { session: "", userId: 0, username: "AI", elo: 3500 },
        user: currentGame.white.user,
        chat: [],
      });
    } else {
      send(socket, { type: "ERROR", error: "GAME IS FULL" });
    }
    return;
  }

  const currentPlayerColor = await userInGame(user, gameId);

  // If the user is not in the game and the game is not against AI, allow user to join as black
  if (currentPlayerColor === false && currentGame?.againstAI === false) {
    if (currentGame?.black === undefined) {
      addToGame(gameId, user, socket);
      return;
    }
    send(socket, { type: "ERROR", error: "GAME IS FULL" });
    return;
  }

  // Both players exist in the current game, update the current player's object with their current session and socket
  const currentUser = await usersService.getSession(user);
  const currentPlayerColorIndex: string = currentPlayerColor as string;
  let updatedGame: GameConnection;
  updatedGame = {
    ...currentGame!,
    [currentPlayerColorIndex]: {
      ...currentGame![currentPlayerColorIndex],
      user: {
        session: user,
        userId: currentUser!.userId,
        username: currentUser!.username,
        elo: currentUser!.elo,
      },
      socket,
    },
  };

  games.set(gameId, updatedGame);
  send(socket, { type: "INIT", color: currentPlayerColor });
  send(socket, { type: "UPDATE", pgn: updatedGame!.game.pgn(), history: currentGame!.history, comment: currentGame!.comment ?? "" });

  // Don't force re-connecting user's back into loading screen
  if (updatedGame?.black?.user !== undefined) {
    send(socket, {
      type: "START",
      opponent:
        currentPlayerColor === "white"
          ? updatedGame.black!.user
          : updatedGame.white.user,
      user:
        currentPlayerColor === "white"
          ? updatedGame.white!.user
          : updatedGame.black.user,
      chat: updatedGame.chat,
    });
  }
}

async function handleMove(socket: WebSocket, data: any) {
  console.log("HANDLE MOVE");
  const { from, to, gameId, user } = data;
  try {
    const currentGame = games.get(gameId);
    const color = currentGame!.white.user.session === user ? "w" : "b"; // TODO: Implement spectator
    const currentPieceColor = currentGame?.game.get(from).color;
    if (color !== currentPieceColor) {
      send(socket, { type: "INVALID", error: "INVALID MOVE WRONG COLOR" });
      return;
    }

    const gameCopy = new Chess();
    gameCopy.loadPgn(currentGame!.game.pgn());
    gameCopy.move({ from, to, promotion: "q" });
    
    currentGame!.history.push(gameCopy.fen());
    games.set(gameId, { ...currentGame!, game: gameCopy, history: currentGame!.history });

    let comment = "";
    if (openings[gameCopy.pgn()] !== undefined) {
      comment =
        openings[gameCopy.pgn()].white ?? openings[gameCopy.pgn()].black;
    }

    const clientMessage = JSON.stringify({
      type: "UPDATE",
      pgn: gameCopy.pgn(),
      history: currentGame!.history,
      comment,
    });

    // Check stockfish
    currentGame?.stockfish!.loadFen(gameCopy.fen());
    currentGame?.stockfish!.write("go depth 1");

    currentGame!.white!.socket!.send(clientMessage);

    // TODO: Refactor all of this
    if(currentGame?.againstAI) {
      console.log("Handling AI move");
      // TODO Handle AI checkmate
      const aiGameCopy = new Chess();
      aiGameCopy.loadPgn(gameCopy.pgn());
      const bestMove: string = await currentGame.stockfish?.getBestMove() as string;
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2);
      aiGameCopy.move({from, to, promotion: 'q'});
      currentGame.stockfish!.bestMove = null; // MAKE SURE TO RESET THIS

      currentGame!.history.push(aiGameCopy.fen());
      games.set(gameId, {...currentGame!, game: aiGameCopy, history: currentGame!.history});
      
      // If response is too fast it cancels animations on frontend
      setTimeout(() => {
        console.log("Sending AI move to game");
        currentGame!.white!.socket!.send(JSON.stringify({type: "UPDATE", pgn: aiGameCopy.pgn(), history: currentGame!.history}));
        console.log("AI move has been sentt to client")
      }, 800);
      return;
    }
    currentGame!.black!.socket!.send(clientMessage);

    if (gameCopy.isGameOver()) {
      if (gameCopy.isCheckmate()) {
        handleCheckmate(gameId);
        return;
      } else {
        sendToGame(gameId, { type: "ERROR", error: "GAMEEVENT UNCHECKD" });
      }
    }
  } catch (e: any) {
    send(socket, { type: "INVALID", error: "INVALID MOVE ENGINE FAIL", e });
    return;
  }
}

async function handleCheckmate(gameId: string) {
  const game: GameConnection = games.get(gameId) as GameConnection;

  // Don't calculate ELO change against bot
  if (game?.againstAI) {
    send(game.white.socket, { type: "GAMEEVENT", event: "CHECKMATE" });
    return;
  }

  const whiteUserId = game!.white!.user!.userId;
  const whiteElo = game!.white!.user!.elo;

  const blackUserId = game!.black!.user!.userId;
  const blackElo = game!.black!.user!.elo;

  const winner = game!.game.turn() === "w" ? "black" : "white";
  const whiteNewElo = calculateEloRating(
    whiteElo,
    blackElo,
    winner === "white" ? GameResult.WIN : GameResult.LOSS
  );
  const blackNewElo = calculateEloRating(
    blackElo,
    whiteElo,
    winner === "black" ? GameResult.WIN : GameResult.LOSS
  );

  usersService.updateElo(whiteUserId, whiteNewElo);
  usersService.updateElo(blackUserId, blackNewElo);

  send(game.white.socket, {
    type: "GAMEEVENT",
    event: "CHECKMATE",
    data: { winner, elo: whiteNewElo },
  });
  send(game!.black!.socket, {
    type: "GAMEEVENT",
    event: "CHECKMATE",
    data: { winner, elo: blackNewElo },
  });
}

async function handleReset(socket: WebSocket, data: any) {
  const { gameId } = data;
  const currentGame = games.get(gameId);
  const gameCopy = new Chess();
  currentGame?.stockfish?.setPosition("startpos");
  games.set(gameId, { ...currentGame!, game: gameCopy });

  if (
    currentGame!.black!.socket !== socket &&
    currentGame!.white!.socket !== socket
  ) {
    const clientMessage = JSON.stringify({
      type: "ERROR",
      error: "NOT PART OF GAME",
    });
    socket.send(clientMessage);
    return;
  }

  sendToGame(gameId, {
    type: "UPDATE",
    pgn: gameCopy.pgn(),
    history: currentGame!.history,
    comment: "",
  });
}

async function handleChat(socket: WebSocket, data: any) {
  const { message, gameId } = data;

  // TODO: Max chat length
  // TODO: Min chat length
  // TODO: Banned words
  // TODO: canSendChat() to check for admin muted players
  const currentUser = userFromSocket(gameId, socket);
  if (currentUser === false) {
    return;
  }

  const currentGame = games.get(gameId);
  let tempGameChat: ChatMessage[] = [];
  if (currentGame?.chat !== undefined) {
    tempGameChat = [
      ...currentGame.chat,
      {
        username: currentUser.username,
        message,
        timestamp: new Date().toDateString(),
      },
    ] as ChatMessage[];
  } else {
    tempGameChat = [
      {
        username: currentUser.username,
        message,
        timestamp: new Date().toDateString(),
      },
    ];
  }
  const clientMessage = { type: "CHATUPDATE", gameChat: tempGameChat };
  games.set(gameId, { ...currentGame!, chat: tempGameChat });
  if(currentGame?.againstAI) {
    send(currentGame.white.socket, clientMessage);
    return;
  }
  sendToGame(gameId, clientMessage);
}

async function createNewGame(
  gameId: string,
  user: string,
  againstAI: boolean,
  socket: WebSocket
) {
  const userData = await usersService.getSession(user);
  const userObject: User = {
    session: user,
    userId: userData?.userId,
    username: userData?.username,
    elo: userData?.elo,
  };

  const newGameObject = new Chess();
  const newGame = {
    game: newGameObject,
    history: [newGameObject.fen()],
    white: { user: userObject, socket },
    againstAI,
    chat: [],
  }
  games.set(gameId, newGame);
  send(socket, { type: "INIT", color: "white" });
  return newGame;
}

async function userInGame(user: string, gameId: any) {
  const currentGame = games.get(gameId);
  const currentUser = await usersService.getSession(user);

  if (!currentUser) return false;
  if (currentGame?.white.user.userId === currentUser.userId) return "white";
  if (currentGame?.black?.user?.userId === currentUser.userId) return "black";
  return false;
}

async function addToGame(gameId: string, user: string, socket: WebSocket) {
  const userObject: User = await getUserFromSession(user);

  // Add black, stockfish, and chat to game.
  const game: GameConnection = games.get(gameId) as GameConnection;
  const updatedGame: GameConnection = {
    ...game,
    black: { user: userObject, socket },
    stockfish: new Stockfish(),
    chat: [],
  };
  if (!updatedGame) return;
  games.set(gameId, updatedGame);

  // Start the game for black
  send(socket, { type: "INIT", color: "black" });
  send(socket, {
    type: "START",
    opponent: updatedGame!.white.user,
    user: userObject,
  });

  // Start the game for white
  send(updatedGame!.white.socket, {
    type: "START",
    opponent: userObject,
    user: updatedGame!.white.user,
  });
}

function userFromSocket(gameId: string, socket: WebSocket) {
  const currentGame = games.get(gameId);
  if (currentGame!.white!.socket === socket) return currentGame!.white!.user;
  if (currentGame!.black!.socket === socket) return currentGame!.black!.user;
  return false;
}

async function sendToGame(gameId: string, message: any) {
  const currentGame = games.get(gameId);
  const { white, black }: any = currentGame;
  const whiteSocket = white.socket;
  const blackSocket = black.socket;
  send(whiteSocket, message);
  send(blackSocket, message);
}

async function getUserFromSession(session: string): Promise<User> {
  const userData = await usersService.getSession(session);
  const userObject: User = {
    session,
    userId: userData?.userId,
    username: userData?.username,
    elo: userData?.elo,
  };
  return userObject;
}
