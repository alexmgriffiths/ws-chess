import { config } from 'dotenv';
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "https";
import { readFileSync } from "fs";
import { Chess } from "chess.js";
import { GameConnection } from "./models/GameConnection";
import { parsePGNFile } from "./helpers/PGNHelper";
import { User } from "./models/User";
import { Stockfish } from "./stockfish";
import { ChatMessage } from "./models/ChatMessage";
import { calculateEloRating, GameResult } from "./helpers/ratingHelper";
import UsersService from "./services/userService";

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
  PING: (socket: WebSocket, _data: any) => send(socket, { type: "PONG" }),
  START: handleStart,
  MOVE: handleMove,
  RESIGN: handleResign,
  RESET: handleReset,
  CHAT: handleChat,
};

function send(socket: WebSocket, message: any) {
  const clientMessage = JSON.stringify(message);
  socket.send(clientMessage);
}

async function handleStart(socket: WebSocket, data: any) {
  const { user, gameId, againstAI } = data;

  // Game ID not found, make a new one
  if (games.get(gameId) === undefined) {
    const newGame: GameConnection = await createNewGame(gameId, user, againstAI, socket);

    // If against AI start the game
    if (againstAI) {
      games.set(gameId, {...newGame, stockfish: new Stockfish()});
      send(socket, { type: "UPDATE", pgn: "", history: [newGame.game.fen()], moveHistory: [] });
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
      send(socket, { type: "UPDATE", pgn: currentGame.game.pgn(), history: currentGame.history, comment: currentGame.comment, moveHistory: currentGame.moveHistory });
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
  send(socket, { type: "UPDATE", pgn: updatedGame!.game.pgn(), history: currentGame!.history, comment: currentGame!.comment ?? "", moveHistory: currentGame!.moveHistory });

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
    currentGame!.moveHistory.push({from, to});
    games.set(gameId, { ...currentGame!, game: gameCopy, history: currentGame!.history, moveHistory:currentGame!.moveHistory });

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
      moveHistory: currentGame!.moveHistory,
      inCheck: gameCopy.inCheck() ? ((currentPieceColor === "w") ? 'b' : 'w') : false
    });
    console.log(clientMessage);
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
      currentGame!.moveHistory.push({from, to});
      games.set(gameId, {...currentGame!, game: aiGameCopy, history: currentGame!.history, moveHistory: currentGame!.moveHistory});
      
      // If response is too fast it cancels animations on frontend
      setTimeout(() => {
        currentGame!.white!.socket!.send(JSON.stringify({type: "UPDATE", pgn: aiGameCopy.pgn(), history: currentGame!.history, comment: currentGame!.comment, moveHistory: currentGame!.moveHistory}));
      }, 800);
      return;
    }
    currentGame!.black!.socket!.send(clientMessage);

    // TODO: Split these up / make it so frontend can distinguish
    if (gameCopy.isGameOver()) {
      if (gameCopy.isCheckmate()) {
        handleWin(gameId, socket, "CHECKMATE");
        return;
      } else if(gameCopy.isInsufficientMaterial()) {
        handleWin(gameId, socket, "INSUFFICIENTMATERIAL");
        return;
      } else if(gameCopy.isThreefoldRepetition()) {
        handleDraw(gameId, socket, "REPETITION");
        return;
      } else if(gameCopy.isStalemate()) {
        handleDraw(gameId, socket, "STALEMATE");
        return;
      }
    }
  } catch (e: any) {
    send(socket, { type: "INVALID", error: "INVALID MOVE ENGINE FAIL", e });
    return;
  }
}

async function handleDraw(gameId: string, socket: WebSocket, event: string = "STALEMATE") {
  const game: GameConnection = games.get(gameId) as GameConnection;
  const currentUser: User = userFromSocket(gameId, socket) as User;

  if (game?.againstAI) {
    send(game.white.socket, { type: "GAMEEVENT", event, eventData: { elo: currentUser.elo, result: "Draw"}});
    return;
  }

  if(game?.gameOver === true) {
    return;
  }

  // Handle ELO process (Todo, breakout)
  const whiteUserId = game!.white!.user!.userId;
  const whiteElo = game!.white!.user!.elo;
  const blackUserId = game!.black!.user!.userId;
  const blackElo = game!.black!.user!.elo;
  const whiteNewElo = calculateEloRating(whiteElo, blackElo, GameResult.DRAW);
  const blackNewElo = calculateEloRating(blackElo, whiteElo, GameResult.DRAW);
  usersService.updateElo(whiteUserId, whiteNewElo);
  usersService.updateElo(blackUserId, blackNewElo);
  games.set(gameId, {...game, gameOver: true});

  send(game.white.socket, { type: "GAMEEVENT", event, eventData: { elo: whiteNewElo, result: "Draw"}});
  send(game!.black!.socket, { type: "GAMEEVENT", event, eventData: { elo: blackNewElo, result: "Draw"}});

}

async function handleWin(gameId: string, socket: WebSocket, event: string = "CHECKMATE") {
  const game: GameConnection = games.get(gameId) as GameConnection;
  const currentUser: User = userFromSocket(gameId, socket) as User;
  const userColor = await userInGame(currentUser.session, gameId);
  const winner = game!.game.turn() === "w" ? "black" : "white";

  // Don't calculate ELO change against bot
  if (game?.againstAI) {
    send(game.white.socket, { type: "GAMEEVENT", event, eventData: { elo: currentUser.elo, result: winner === userColor ? "Win" : "Lose"}});
    return;
  }

  if(game?.gameOver === true) {
    return;
  }

  const whiteUserId = game!.white!.user!.userId;
  const whiteElo = game!.white!.user!.elo;

  const blackUserId = game!.black!.user!.userId;
  const blackElo = game!.black!.user!.elo;

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

  games.set(gameId, {...game, gameOver: true});

  send(game.white.socket, {
    type: "GAMEEVENT",
    event: "CHECKMATE",
    eventData: { elo: whiteNewElo, result: winner === "white" ? "Win" : "Lose" },
  });
  send(game!.black!.socket, {
    type: "GAMEEVENT",
    event: "CHECKMATE",
    eventData: { elo: blackNewElo, result: winner === "black" ? "Win" : "Lose" },
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

  const resetMessage = {
    type: "UPDATE",
    pgn: gameCopy.pgn(),
    history: currentGame!.history,
    comment: "",
  };

  if(currentGame?.againstAI) {
    send(currentGame!.white!.socket, resetMessage);
    return;
  }
  sendToGame(gameId, resetMessage);
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

async function handleResign(socket: WebSocket, data: any) {
  const { gameId } = data;
  const game: GameConnection = games.get(gameId) as GameConnection;
  const currentUser: User = userFromSocket(gameId, socket) as User;

  if(game.againstAI) {
    send(socket, {
      type: "GAMEEVENT",
      event: "RESIGN",
      eventData: { elo: 0, result: "Lose" }
    });
    return;
  }

  // Prevent boosting
  if(game.gameOver === true) {
    return;
  }
  games.set(gameId, {...game, gameOver: true});

  // TODO: Clean up, this code is basically the same as checkmate
  const winner = game.white.user.userId === currentUser.userId ? 'black' : 'white';

  const whiteUserId = game!.white!.user!.userId;
  const whiteElo = game!.white!.user!.elo;

  const blackUserId = game!.black!.user!.userId;
  const blackElo = game!.black!.user!.elo;
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
    event: "RESIGN",
    eventData: { elo: whiteNewElo, result: winner === "white" ? "Win" : "Lose" },
  });
  send(game!.black!.socket, {
    type: "GAMEEVENT",
    event: "RESIGN",
    eventData: { elo: blackNewElo, result: winner === "black" ? "Win" : "Lose" },
  });

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
  const newGame: GameConnection = {
    game: newGameObject,
    history: [newGameObject.fen()],
    moveHistory: [],
    white: { user: userObject, socket },
    againstAI,
    chat: [],
    gameOver: false
  }
  games.set(gameId, newGame);
  send(socket, { type: "INIT", color: "white" });
  return newGame;
}

async function userInGame(session: string, gameId: any) {
  const currentGame = games.get(gameId);
  const currentUser = await usersService.getSession(session);

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
