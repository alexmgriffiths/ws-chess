import { Chess } from "chess.js";
import { Player } from "./Player";
export type GameConnection = {
    game: Chess, 
    white: Player,
    black?: Player
}