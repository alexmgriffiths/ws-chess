import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { Chess } from 'chess.js';
import { GameConnection } from './models/GameConnection';
import { parsePGNFile } from './helpers/PGNHelper';
import { User } from './models/User';
import UsersService from './services/userService';
import { ChatMessage } from './models/ChatMessage';

export function setupSocket() {
  const openings: any = parsePGNFile("eco.pgn");
  const usersService = new UsersService();

  const server = createServer({
    cert: readFileSync('./certs/cert.pem'),
    key: readFileSync('./certs/key.pem')
  });
  server.listen(process.env.WS_PORT);

  const wss = new WebSocketServer({ 
    server
  });
  const games = new Map<string, GameConnection>();

  wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', handleMessage);

    function handleMessage(data: any) {
      console.log('received: %s', data);
      const event = JSON.parse(data as string);
      switch (event.type) {
        case "SEARCHGAMECODE":
          searchGameCode(ws, event.code);
        break;
        case 'PING':
          handlePing(ws);
          break;
        case 'START':
          handleStart(ws, event.data);
          break;
        case 'MOVE':
          handleMove(ws, event.data);
          break;
        case "RESET":
          handleReset(ws, event.data);
          break;
        case "CHAT":
          handleChat(ws, event.data);
        break;
        default:
          console.warn(`Unknown event type: ${event.type}`);
      }
    }

    function userFromSocket(gameId: string, socket: WebSocket) {
      const currentGame = games.get(gameId);
      if(currentGame!.white!.socket === socket) return currentGame!.white!.user;
      if(currentGame!.black!.socket === socket) return currentGame!.black!.user;
      return false;
    }

    async function handleChat(socket: WebSocket, data: any) {
      const { message, gameId } = data;

      const currentUser = userFromSocket(gameId, socket);
      if(currentUser === false) {
        return;
      }

      const currentGame = games.get(gameId);
      let tempGameChat: ChatMessage[] = [];
      if(currentGame?.chat !== undefined) {
        tempGameChat = [...currentGame.chat, {username: currentUser.username, message, timestamp: new Date().toDateString()}] as ChatMessage[];
      } else {
        tempGameChat = [{username: currentUser.username, message, timestamp: new Date().toDateString()}]
      }
      const clientMessage = {type: "CHATUPDATE", gameChat: tempGameChat};
      games.set(gameId, {game: currentGame!.game, white: currentGame!.white, black: currentGame!.black, chat: tempGameChat });
      sendToGame(gameId, clientMessage);
    }

    async function sendToGame(gameId: string, message: any) {
      const currentGame = games.get(gameId);
      const { white, black }: any = currentGame;
      const whiteSocket = white.socket;
      const blackSocket = black.socket;
      send(whiteSocket, message);
      send(blackSocket, message);
    }

    function searchGameCode(socket: WebSocket, code: any) {
      if(games.get(code) !== undefined) {
        send(socket, {type: "SEARCHRESULT", result: "FOUND"})
      } else {
        send(socket, {type: "SEARCHRESULT", result: "NOT FOUND"})
      }
    }

    function send(socket: WebSocket, message: any) {
      const clientMessage = JSON.stringify(message);
      socket.send(clientMessage);
    }

    function handlePing(socket: WebSocket) {
      send(socket, {type: "PONG"});
    }

    async function userInGame(user: string, gameId: any) {
      const currentGame = games.get(gameId);
      const currentUser = await usersService.getSession(user);

      if(currentGame?.white.user.userId == currentUser.userId) return "white";
      if(currentGame?.black?.user.userId == currentUser.userId) return "black";
      return false;
    }

    async function handleStart(socket: WebSocket, data: any) {
      const { user, gameId } = data;
      if(games.get(gameId) === undefined) {
        createNewGame(gameId, user, socket);
        return;
      }
        
      const currentGame = games.get(gameId);
      const currentPlayerColor = await userInGame(user, gameId);
      if(currentPlayerColor === false) {
        if(currentGame?.black === undefined) {
          addToGame(gameId, user, socket);
          return;
        }
        send(socket, {type: "ERROR", error: "GAME IS FULL"});
        return;
      }

      const currentUser = await usersService.getSession(user);
      if(currentPlayerColor === "white") {
        games.set(gameId, {game: currentGame!.game, white: {user: {
          session: user,
          userId: currentUser.userId,
          username: currentUser.username,
          elo: currentUser.elo
        }, socket}, black: currentGame?.black});
      } else if(currentPlayerColor === "black") {
        games.set(gameId, {game: currentGame!.game, white: currentGame!.white, black: {user: {
          session: user,
          userId: currentUser.userId,
          username: currentUser.username,
          elo: currentUser.elo
        }, socket}});
      }

      send(socket, {type: "INIT", color: currentPlayerColor});
      send(socket, {type: "UPDATE", pgn: currentGame!.game.pgn()});

      // Don't force re-connecting user's back into loading screen
      if(currentGame?.black?.user !== undefined) {
        send(socket, {
          type: "START", 
          opponent: currentPlayerColor === "white" ? currentGame.black!.user : currentGame.white.user,
          user: currentPlayerColor === "white" ? currentGame.white!.user : currentGame.black.user,
          chat: currentGame.chat
        });
      }
    }

    async function createNewGame(gameId: string, user: string, socket: WebSocket) {
      const userData = await usersService.getSession(user);
      const userObject: User = {
        session: user,
        userId: userData.userId,
        username: userData.username,
        elo: userData.elo
      }
      games.set(gameId, { game: new Chess(), white: { user: userObject, socket }});

      const clientMessage = JSON.stringify({type: "INIT", color: "white"});
      socket.send(clientMessage);
    }

    async function addToGame(gameId: string, user: string, socket: WebSocket) {
      const userData = await usersService.getSession(user);
      const userObject: User = {
        session: user,
        userId: userData.userId,
        username: userData.username,
        elo: userData.elo
      }
      const game = games.get(gameId);
      games.set(gameId, {game: game!.game, white: game!.white, black: { user: userObject, socket }});

      // Start the game for black
      send(socket, {type: "INIT", color: "black"});
      send(socket, {type: "START", opponent: game!.white.user, user: userObject});

      // Start the game for white
      send(game!.white.socket, {type: "START", opponent: userObject, user: game!.white.user});
    }

    function handleMove(socket: WebSocket, data: any) {
      const {from, to, gameId, user } = data;
      try {
        const currentGame = games.get(gameId);
        const color = currentGame!.white.user.session === user ? "w" : "b"; // TODO: Implement spectator
        const currentPieceColor = currentGame?.game.get(from).color;
        if(color !== currentPieceColor) {
          const clientMessage = JSON.stringify({type: "INVALID", error: "INVALID MOVE WRONG COLOR"});
          socket.send(clientMessage);
          return;
        }

        const gameCopy = new Chess();
        gameCopy.loadPgn(currentGame!.game.pgn());
        gameCopy.move({from, to});
        games.set(gameId, {game: gameCopy, white: currentGame!.white, black: currentGame!.black});

        let comment = "";
        if(openings[gameCopy.pgn()] !== undefined) {
          comment = openings[gameCopy.pgn()].white ?? openings[gameCopy.pgn()].black;
        }

        const clientMessage = JSON.stringify({
          type: "UPDATE",
          pgn: gameCopy.pgn(),
          comment
        });
        
        currentGame!.black!.socket!.send(clientMessage);
        currentGame!.white!.socket!.send(clientMessage);

        if(gameCopy.isCheckmate()) {
          send(currentGame!.black!.socket!, {type: "GAMEEVENT", error: "CHECKMATE" });
          send(currentGame!.white!.socket!, {type: "GAMEEVENT", error: "CHECKMATE" });
        }
        
      } catch (e: any) {
        const clientMessage = JSON.stringify({type: "INVALID", error: "INVALID MOVE ENGINE FAIL"});
        socket.send(clientMessage);
      }
    }

    async function handleReset(socket: WebSocket, data: any) {
      const { gameId } = data;
      const currentGame = games.get(gameId);
      const gameCopy = new Chess();
      games.set(gameId, {game: gameCopy, white: currentGame!.white, black: currentGame!.black});
      const clientMessage = JSON.stringify({
        type: "UPDATE",
        pgn: gameCopy.pgn(),
        comment: ""
      });

      currentGame?.white.socket
      
      if(currentGame!.black!.socket !== socket && currentGame!.white!.socket !== socket) {
        const clientMessage = JSON.stringify({type: "ERROR", error: "NOT PART OF GAME"});
        socket.send(clientMessage);
        return;
      }

      currentGame!.black!.socket!.send(clientMessage);
      currentGame!.white!.socket!.send(clientMessage);
    }

  });

  console.log("WEBSOCKET LISTENING ON PORT ", process.env.WS_PORT);
}