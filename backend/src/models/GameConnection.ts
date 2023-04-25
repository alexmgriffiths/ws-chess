import { Chess } from "chess.js";
import { Stockfish } from "../stockfish";
import { ChatMessage } from "./ChatMessage";
import { Player } from "./Player";
export type GameConnection = {
    game: Chess, 
    white: Player,
    black?: Player,
    againstAI?: boolean
    stockfish?: Stockfish
    chat?: ChatMessage[],
    [key: string]: any;
}