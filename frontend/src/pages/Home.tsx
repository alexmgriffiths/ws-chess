import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { AuthContext } from "../AuthContext";
import { Button, Input } from "../components";

export default function Home(_props: any) {
  const { setAuthToken } = useContext(AuthContext);

  const [gameCode, setGameCode] = useState("");
  const navigate = useNavigate();

  const createGame = () => {
    navigate(`/game?gameId=${gameCode}`);
  };

  const logout = () => {
    Cookies.remove("token", { secure: true, sameSite: "none" });
    setAuthToken("");
  };

  return (
    <>
      <h1>Home!</h1>
      <div style={{display: 'flex', flexDirection: 'row', alignItems: 'flex-end'}}>
        <Input label="Game Code" placeholder="XYZ123456" onChange={setGameCode} value={gameCode}/>
        <Button onClick={createGame}>Join / Create Game</Button>
      </div>
      <br />
      <button onClick={logout}>Logout</button>
    </>
  );
}
