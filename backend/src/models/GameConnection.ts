import { Chess } from "chess.js";
import { Stockfish } from "../stockfish";
import { ChatMessage } from "./ChatMessage";
import { Player } from "./Player";
import { Move } from "./Move";
export type GameConnection = {
    game: Chess,
    history: string[],
    moveHistory: Move[]
    white: Player,
    black?: Player,
    againstAI?: boolean
    stockfish?: Stockfish
    chat?: ChatMessage[],
    gameOver?: boolean
    [key: string]: any;
}