import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

const slideDown = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-50%);
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
  z-index:9999;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  animation: ${fadeIn} 0.5s ease-in forwards;
`;

const ModalContent = styled.div`
  margin-top:-20%;
  background-color: #fff;
  color: #333;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
  animation: ${slideDown} 0.5s ease-in forwards;
`;

export const Modal = ({ isOpen, onClose, children }: any) => {
  return (
    <>
      {isOpen && (
        <ModalContainer>
          <ModalContent>
            {children}
            <button onClick={onClose}>Close Modal</button>
          </ModalContent>
        </ModalContainer>
      )}
    </>
  );
};