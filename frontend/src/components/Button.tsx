import styled from 'styled-components';

const ButtonWrapper = styled.button`
  padding: 8px 16px;
  background-color: #0077cc;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  max-height: 48px;
  &:hover {
    background-color: #005fa3;
  }

  &:active {
    background-color: #004b80;
  }
`;

export function Button({ children, onClick }: any) {
  return (
    <ButtonWrapper onClick={onClick}>
      {children}
    </ButtonWrapper>
  );
}
