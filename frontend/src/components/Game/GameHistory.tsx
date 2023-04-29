export const GameHistory = ({gameComment, gameFenHistory}: any) => {
    return (
        <div id="history">
            <h3>{gameComment}</h3>
            {gameFenHistory && gameFenHistory.map((move: string, index: number) => (
                <div key={index}>
                <span>{move}</span>
                <br />
                </div>
            ))}
        </div>
    )
}