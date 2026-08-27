import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { Box } from '@mui/material';

import { LoginConfig } from '../Login/config';

import RegisterComplete from './RegisterComplete';
import RegisteredAccount from './RegisteredAccount';
import RegisteredDetail from './RegisteredDetail';
import RegisteredFinish from './RegisteredFinish';

const StyledRegisterContent = styled(Box)({
  '& #b3-customForm-id-name': {
    '& label[data-shrink="true"]': {
      whiteSpace: 'break-spaces',
      minWidth: 'calc(133% - 24px)',
      transition: 'unset',
    },
    '& label[data-shrink="false"]': {
      whiteSpace: 'break-spaces',
    },
  },
  '& .MuiFormControl-root': {
    marginBottom: '8px',
  },
  '& .MuiOutlinedInput-root, & .MuiFilledInput-root': {
    backgroundColor: '#242424',
    borderRadius: '6px',
  },
  '& .MuiOutlinedInput-root fieldset': {
    borderColor: '#BCC5CF',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root:hover fieldset': {
    borderColor: '#8D98A5',
  },
  '& .MuiOutlinedInput-root.Mui-focused fieldset': {
    borderColor: '#BCC5CF',
  },
  '& .MuiFilledInput-root:before': {
    borderBottomColor: '#BCC5CF',
  },
  '& .MuiFilledInput-root:hover:not(.Mui-disabled, .Mui-error):before': {
    borderBottomColor: '#8D98A5',
  },
  '& .MuiFilledInput-root.Mui-focused:after': {
    borderBottomColor: '#BCC5CF',
  },
  '& .MuiInputBase-input, & .MuiSelect-select': {
    color: '#F3F4F6',
  },
  '& .MuiInputBase-input::placeholder': {
    color: '#D1D5DB',
    opacity: 1,
  },
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
    WebkitBoxShadow: '0 0 0 1000px #242424 inset !important',
    WebkitTextFillColor: '#F3F4F6 !important',
    caretColor: '#F3F4F6',
    transition: 'background-color 9999s ease-out 0s',
  },
});

interface RegisterContentProps {
  activeStep: number;
  handleBack: () => void;
  handleNext: () => void;
  handleFinish: ({ email, password }: LoginConfig) => void;
}

export default function RegisterContent({
  activeStep,
  handleBack,
  handleNext,
  handleFinish,
}: RegisterContentProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleFinishClick = (shouldAutoLogin: boolean) => {
    if (shouldAutoLogin) {
      handleFinish({ email, password });
    } else {
      navigate('/login');
    }
  };

  const renderStep = (step: number): ReactNode => {
    switch (step) {
      case 0:
        return (
          <RegisteredAccount
            handleNext={(email) => {
              setEmail(email);
              handleNext();
            }}
          />
        );

      case 1:
        return <RegisteredDetail handleBack={handleBack} handleNext={handleNext} />;

      case 2:
        return (
          <RegisterComplete
            handleBack={handleBack}
            handleNext={(password) => {
              setPassword(password);
              handleNext();
            }}
          />
        );

      case 3:
        return <RegisteredFinish handleFinish={handleFinishClick} />;

      default:
        return null;
    }
  };

  return <StyledRegisterContent component="div">{renderStep(activeStep)}</StyledRegisterContent>;
}
