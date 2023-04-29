import { GamePlayerType } from "../models/GamePlayerType"
export const GamePlayer = ({username, elo}: GamePlayerType) => {
    return (
        <div className="playerContainer">
            <div className="nameContainer">{username}</div>
            <div className="eloContainer">({elo})</div>
        </div>
    )
}