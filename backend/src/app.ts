import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';
import { GameConnection } from './GameConnection';
import { parsePGNFile } from './Identifier';

const openings: any = parsePGNFile();
const wss = new WebSocketServer({ port: 8080 });
const games = new Map<number, GameConnection>();

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
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
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

  function userInGame(userId: any, gameId: any) {
    const currentGame = games.get(gameId);
    if(currentGame?.white.userId == userId) return "white";
    if(currentGame?.black?.userId === userId) return "black";
    return false;
  }

  function handleStart(socket: WebSocket, data: any) {
    const { userId, gameId } = data;
    if(games.get(gameId) === undefined) {
      createNewGame(gameId, userId, socket);
      return;
    }
      
    const currentGame = games.get(gameId);
    const currentPlayerColor = userInGame(userId, gameId);
    
    if(currentPlayerColor === false) {
      addToGame(gameId, userId, socket);
      return;
    }

    if(currentPlayerColor === "white") {
      games.set(gameId, {game: currentGame!.game, white: {userId, socket}, black: currentGame?.black});
    } else if(currentPlayerColor === "black") {
      games.set(gameId, {game: currentGame!.game, white: currentGame!.white, black: {userId, socket}});
    }

    send(socket, {type: "INIT", color: currentPlayerColor});
    send(socket, {type: "UPDATE", pgn: currentGame!.game.pgn()});

    // Don't force re-connecting user's back into loading screen
    if(currentGame?.black?.userId !== undefined) {
      send(socket, {type: "START", opponent: currentPlayerColor === "white" ? currentGame.black!.userId : currentGame.white.userId});
    }
  }

  function createNewGame(gameId: number, userId: string | number, socket: WebSocket) {
    games.set(gameId, { game: new Chess(), white: { userId, socket }});

    const clientMessage = JSON.stringify({type: "INIT", color: "white"});
    socket.send(clientMessage);
  }

  function addToGame(gameId: number, userId: string | number, socket: WebSocket) {
    const game = games.get(gameId);
    games.set(gameId, {game: game!.game, white: game!.white, black: { userId, socket }});

    // Start the game for black
    send(socket, {type: "INIT", color: "black"});
    send(socket, {type: "START", opponent: game!.white.userId});

    // Start the game for white
    send(game!.white.socket, {type: "START", opponent: userId});
  }

  function handleMove(socket: WebSocket, data: any) {
    const {from, to, gameId, userId } = data;
    try {
      const currentGame = games.get(gameId);
      const color = currentGame!.white.userId === userId ? "w" : "b"; // TODO: Implement spectator
      const currentPieceColor = currentGame?.game.get(from).color;
      if(color !== currentPieceColor) {
        const clientMessage = JSON.stringify({type: "ERROR", error: "INVALID MOVE"});
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
        //comment: openings[gameCopy.pgn()].white ?? ""
      })
      currentGame!.black!.socket!.send(clientMessage);
      currentGame!.white!.socket!.send(clientMessage);
    } catch (e: any) {
      const clientMessage = JSON.stringify({type: "ERROR", error: "INVALID MOVE"});
      socket.send(clientMessage);
    }
  }
});
