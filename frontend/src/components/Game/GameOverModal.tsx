import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button } from '../Button';

const slideDown = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-25%);
  }
  100% {
    opacity: 1;
    transform: translateY(0%);
  }
`;

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const ModalContainer = styled.div`
  overflow:hidden;
  z-index:9999;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  animation: ${fadeIn} 0.4s ease-in forwards;
`;

const ModalContent = styled.div`
  overflow:hidden;
  position: relative;
  margin-top:-20%;
  background-color: #fff;
  color: #333;
  border-radius: 5px;
  width:340px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: translateY(-25%);
  animation: ${slideDown} 0.4s ease-in forwards;
`;

const ModalHeader = styled.div`
  font-weight: bold;
  font-size: 1.5rem;
  color:white;
`

const ModalTextContent = styled.div`
    padding-top:20px;
    text-align: center;
    font-size:22px;
`;

let ModalHeaderContainer = styled.div`
    position: relative;
    padding:20px;
    z-index: 1;
    text-align: center;
    border-bottom-right-radius: 50%;
    border-bottom-left-radius:50%;
    background-color: #779952;
    width:175%;
    transform: translateX(-23%);
`

const ModalHeaderDescription = styled.div`
color: #FFF;
`

const ButtonHolder = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding:20px;
`
// TODO Actual close icon instead of 'x'
const CloseButton = styled.div`
 position: absolute;
 right: 0;
 z-index: 8989; 
 color: white;
 border:none;
 cursor: pointer;
 font-weight: bold;
 margin: 5px 15px;
 font-size:22px;
`;
export const GameOverModal = ({ isOpen, onClose, type="Draw", endType="Stalemate", elo, newElo, handleRematch, handleNewGame }: any) => {

  const [displayedScore, setDisplayedScore] = useState(elo);
  useEffect(() => {
    if(isOpen) {
      runAnimation();
    }
  // eslint-disable-next-line
  }, [isOpen]);

  const runAnimation = () => {
    setTimeout(() => {
      setDisplayedScore((previousScore: any) => {
        if (previousScore - 1 > newElo) {
          runAnimation(); // Call runAnimation recursively
          return previousScore - 1;
        } else if (previousScore + 1 < newElo) {
          runAnimation(); // Call runAnimation recursively
          return previousScore + 1;
        } else {
          return newElo;
        }
      });
    }, 80);
  };

  if(type === "Lose") {
    ModalHeaderContainer = styled.div`
      position: relative;
      padding:20px;
      z-index: 1;
      text-align: center;
      border-bottom-right-radius: 50%;
      border-bottom-left-radius:50%;
      background-color: #A33;
      width:175%;
      transform: translateX(-23%);
    `
  }

  if(type === "Draw") {
    ModalHeaderContainer = styled.div`
      position: relative;
      padding:20px;
      z-index: 1;
      text-align: center;
      border-bottom-right-radius: 50%;
      border-bottom-left-radius:50%;
      background-color: #666;
      width:175%;
      transform: translateX(-23%);
    `
    return (
      <>
        {isOpen && (
          <ModalContainer>
            <ModalContent>
              <CloseButton onClick={onClose}>x</CloseButton>
              <ModalHeaderContainer>
                  <ModalHeader>Draw</ModalHeader>
                  <ModalHeaderDescription>By {endType}</ModalHeaderDescription>
              </ModalHeaderContainer>
              <ModalTextContent>
                  {displayedScore}
              </ModalTextContent>
              <ButtonHolder>
                  <Button onClick={handleRematch} type="modal">Rematch</Button>
                  <Button onClick={handleNewGame} type="modal">New Game</Button>
              </ButtonHolder>
            </ModalContent>
          </ModalContainer>
        )}
      </>
    );
  }

  return (
    <>
      {isOpen && (
        <ModalContainer>
          <ModalContent>
            <CloseButton onClick={onClose}>x</CloseButton>
            <ModalHeaderContainer>
                <ModalHeader>You {type}</ModalHeader>
                <ModalHeaderDescription>By {endType}</ModalHeaderDescription>
            </ModalHeaderContainer>
            <ModalTextContent>
                {displayedScore}
            </ModalTextContent>
            <ButtonHolder>
                <Button onClick={handleRematch} type="modal">Rematch</Button>
                <Button onClick={handleNewGame} type="modal">New Game</Button>
            </ButtonHolder>
          </ModalContent>
        </ModalContainer>
      )}
    </>
  );
};