import { useState } from 'react';
import { Input } from '../Input';

export const GameChat = ({gameChat, gameId, socket}: any) => {

    const [chatMessage, setChatMessage] = useState("");
    const chatKeyDown = (key: any) => {
        if (key === "Enter") {
          sendMessage();
        }
    };
    
    const sendMessage = () => {
        const serverMessage = JSON.stringify({
          type: "CHAT",
          data: { message: chatMessage, gameId },
        });
        socket.send(serverMessage);
        setChatMessage("");
    };

    return (
        <div id="history">
            {gameChat &&
                gameChat.map((chat: any, index: number) => (
                <div key={index}>
                    <span>
                    {chat.username} ({chat.timestamp}): {chat.message}
                    </span>
                    <br />
                </div>
                ))}
            <Input
                placeholder="Chat Message"
                onChange={setChatMessage}
                onKeyDown={chatKeyDown}
                value={chatMessage}
            />
        </div>
    )
}