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

const ModalButton = styled.button`
  padding: 16px 24px;
  background-color: #EAEAEA;
  color: #555;
  font-weight: bold;
  letter-spacing:1px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  max-height: 48px;
  &:hover {
    background-color: #DFDFDF;
  }

  &:active {
    background-color: #CFCFCF;
  }
`

export function Button({ children, onClick, type="primary" }: any) {

  if(type === "primary") {
    return (
      <ButtonWrapper onClick={onClick}>
        {children}
      </ButtonWrapper>
    );
  } else {
    return (
      <ModalButton onClick={onClick}>
        {children}
      </ModalButton>
    );
  }
}
