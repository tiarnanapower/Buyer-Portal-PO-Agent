import { SubmitHandler, useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Typography, useTheme } from '@mui/material';

import { B3CustomForm } from '@/components/B3CustomForm';
import { getContrastColor } from '@/components/outSideComponents/utils/b3CustomStyles';
import { useB3Lang } from '@/lib/lang';

import { getLoginFields, LoginConfig } from './helper';

interface LoginFormProps {
  loginBtn: string;
  handleLoginSubmit: (data: LoginConfig) => void;
  backgroundColor: string;
  isLoading?: boolean;
}

function LoginForm(props: LoginFormProps) {
  const { loginBtn, handleLoginSubmit, backgroundColor, isLoading = false } = props;

  const b3Lang = useB3Lang();
  const theme = useTheme();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
    setValue,
  } = useForm<LoginConfig>({
    mode: 'onSubmit',
  });

  const handleLoginClick: SubmitHandler<LoginConfig> = (data) => {
    handleLoginSubmit(data);
  };

  const loginFields = getLoginFields(b3Lang);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        variant="h5"
        sx={{
          margin: '20px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {b3Lang('login.loginText.signInHeader')}
      </Typography>
      <Box
        sx={{
          width: '100%',
          '& .MuiFormControl-root': {
            mb: 1,
          },
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#222222',
            borderRadius: '6px',
            '& fieldset': {
              borderColor: '#BCC5CF',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: '#8D98A5',
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
            },
          },
          '& input': {
            color: '#F3F4F6',
          },
          '& input::placeholder': {
            color: '#D1D5DB',
            opacity: 1,
          },
          '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus':
            {
              WebkitBoxShadow: '0 0 0 1000px #222222 inset !important',
              WebkitTextFillColor: '#F3F4F6 !important',
              caretColor: '#F3F4F6',
              transition: 'background-color 9999s ease-out 0s',
            },
        }}
      >
        <form onSubmit={handleSubmit(handleLoginClick)}>
          <B3CustomForm
            formFields={loginFields}
            errors={errors}
            control={control}
            getValues={getValues}
            setValue={setValue}
            disabled={isLoading}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start ',
              alignItems: 'center',
              mt: 2,
              gap: 2,
            }}
          >
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                backgroundColor: theme.palette.primary.main,
              }}
            >
              {loginBtn}
            </Button>
            <Link
              component={RouterLink}
              color={getContrastColor(backgroundColor)}
              to="/forgotPassword"
            >
              {b3Lang('login.loginText.forgotPasswordText')}
            </Link>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default LoginForm;
