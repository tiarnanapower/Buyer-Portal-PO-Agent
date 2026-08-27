import styled from '@emotion/styled';
import { Box } from '@mui/material';

export const StyleTipContainer = styled('p')(() => ({
  margin: '2rem auto',
}));

export const InformationFourLabels = styled('h4')(() => ({
  marginBottom: '20px',
}));

export const TipContent = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

export const StyledRegisterContent = styled(Box)({
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
