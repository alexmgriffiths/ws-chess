import { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import { AuthContext } from "../AuthContext";

export default function Home(_props: any) {
  const { setAuthToken } = useContext(AuthContext);

  const [gameCode, setGameCode] = useState("");
  const [navigateToGame, setNavigateToGame] = useState(false);

  const createGame = () => {
    setNavigateToGame(true);
  };

  const logout = () => {
    Cookies.remove("token", { secure: true, sameSite: "none" });
    setAuthToken("");
  };

  return (
    <>
      {navigateToGame && <Navigate to={`/game?gameId=${gameCode}`} />}
      <h1>Home!</h1>
      Game Code:
      <input
        type="text"
        placeholder="XYZ123456"
        onChange={(e) => {
          setGameCode(e.target.value);
        }}
        value={gameCode}
      />
      <button onClick={createGame}>Join Game</button>
      <br />
      <button onClick={logout}>Logout</button>
    </>
  );
}
