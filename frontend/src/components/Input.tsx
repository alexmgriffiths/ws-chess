import styled from "styled-components";

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const InputLabel = styled.label`
  margin-bottom: 8px;
  font-weight: bold;
`;

const InputField = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border:1px solid #7f7f7f;
  font-size: 16px;
  color: #555;

  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 5px rgba(0, 102, 204, 0.5);
  }
`;

export const Input = ({ label, name, value, onChange, onKeyDown = () => {}, placeholder, type = "text" }: any) => {
  return (
    <InputWrapper>
      {label && label.length > 0 && (
        <InputLabel htmlFor={name}>{label}</InputLabel>
      )}
      <InputField
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => {onChange(e.target.value)}}
        onKeyDown={(e) => {onKeyDown(e.key)}}
        placeholder={placeholder}
      />
    </InputWrapper>
  );
};
