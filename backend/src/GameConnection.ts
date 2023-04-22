import { Chess } from "chess.js";
import { WebSocket } from "ws";
export type GameConnection = {
    game: Chess, 
    white: { 
        userId: string | number, 
        socket: WebSocket
    }, 
    black?: { 
        userId: string | number | undefined, 
        socket: WebSocket | undefined 
    } 
}