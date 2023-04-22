import { User } from "./User";
import { WebSocket } from 'ws';
export type Player = {
    user: User,
    socket: WebSocket
}