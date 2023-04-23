import { Chess } from "chess.js";
import { ChatMessage } from "./ChatMessage";
import { Player } from "./Player";
export type GameConnection = {
    game: Chess, 
    white: Player,
    black?: Player
    chat?: ChatMessage[]
}