import { ReactNode, useContext, useMemo } from 'react';
import { Box, Step, StepLabel, Stepper } from '@mui/material';

import { getContrastColor } from '@/components/outSideComponents/utils/b3CustomStyles';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';

import { steps } from '../config';
import { RegisteredContext } from '../Context';
import { RegisterAccountType } from '../types';

interface RegisterStepProps {
  children: ReactNode;
  activeStep: number;
  backgroundColor: string;
}

export default function RegisterStep(props: RegisterStepProps) {
  const { children, activeStep, backgroundColor } = props;

  const b3Lang = useB3Lang();
  const [isMobile] = useMobile();

  const {
    state: { accountType, submitSuccess },
  } = useContext(RegisteredContext);

  const pageTitle = useMemo(() => {
    return submitSuccess
      ? b3Lang(
          accountType === RegisterAccountType.BUSINESS
            ? 'register.title.registerComplete'
            : 'register.title.accountCreated',
        )
      : b3Lang('register.title.accountRegister');
  }, [submitSuccess, accountType, b3Lang]);

  const customColor = getContrastColor(backgroundColor);
  return (
    <Box
      component="div"
      sx={{
        width: isMobile ? '100%' : '537px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
        border: '1px solid #636363',
        borderRadius: '8px',
        marginTop: '1rem',
        background: '#242424',
        padding: '0 0.8rem 1rem 0.8rem',
      }}
    >
      <Box
        component="h3"
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          pt: 2,
          fontSize: '24px',
          fontWeight: '400',
          margin: '0.5rem 0',
          color: customColor,
        }}
      >
        {pageTitle}
      </Box>
      {!submitSuccess && (
        <Stepper
          activeStep={activeStep}
          sx={{
            '& .MuiStepLabel-label': {
              color: '#D9DEE3',
            },
            '& .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed': {
              color: '#D9DEE3 !important',
            },
            '& .MuiStepConnector-line': {
              borderColor: '#8D98A5',
            },
            '& .MuiStepIcon-text': {
              fill: '#111827 !important',
            },
            '& .MuiStepIcon-root': {
              color: '#E5E7EB !important',
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{b3Lang(label)}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      {children}
    </Box>
  );
}
