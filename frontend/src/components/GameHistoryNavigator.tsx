import { Button } from "./Button"

export const GameHistoryNavigator = ({gameHistoryIndex, gameFenHistory, setGameHistoryIndex, game}: any) => {

    const handleHistoryNavigate = (historyIndex: number) => {
        if(historyIndex > gameFenHistory.length - 1 || historyIndex < 0) {
          return;
        }
        game.load(gameFenHistory[historyIndex]);
        setGameHistoryIndex(historyIndex);
    }

    return (
        <div style={{display: "flex", flexDirection: "row", gap: "10px", width: '100%', justifyContent: 'center'}}>
            <Button onClick={() => handleHistoryNavigate(0)}>Beginning</Button>
            <Button onClick={() => handleHistoryNavigate(gameHistoryIndex - 1)}>Back</Button>
            <Button onClick={() => handleHistoryNavigate(gameHistoryIndex + 1)}>Forward</Button>
            <Button onClick={() => handleHistoryNavigate(gameFenHistory.length - 1)}>Current</Button>
        </div>
    )
}