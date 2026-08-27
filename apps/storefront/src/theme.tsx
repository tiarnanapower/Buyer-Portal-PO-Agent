import { ReactNode, useContext } from 'react';
import * as materialMultiLanguages from '@mui/material/locale';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { CustomStyleContext } from './shared/customStyleButton';
import { BROWSER_LANG } from './constants';

type LangMapType = {
  [index: string]: string;
};

const MUI_LANG_MAP: LangMapType = {
  en: 'enUS',
  zh: 'zhCN',
  fr: 'frFR',
  nl: 'nlNL',
  de: 'deDE',
  it: 'itIT',
  es: 'esES',
};

type MaterialMultiLanguagesType = {
  [K: string]: materialMultiLanguages.Localization;
};

type Props = {
  children?: ReactNode;
};

const DARK_BACKGROUND = '#121212';
const DARK_PAPER = '#1e1e1e';
const DARK_SURFACE_BORDER = '1px solid rgba(255, 255, 255, 0.12)';
const DARK_SURFACE_SHADOW = '0 10px 28px rgba(0, 0, 0, 0.45)';

function B3ThemeProvider({ children }: Props) {
  const {
    state: {
      portalStyle: { backgroundColor = '', primaryColor = '' },
    },
  } = useContext(CustomStyleContext);

  const theme = (lang: string) =>
    createTheme(
      {
        palette: {
          mode: 'dark',
          background: {
            default: backgroundColor || DARK_BACKGROUND,
            paper: DARK_PAPER,
          },
          primary: {
            main: primaryColor || '#1976d2',
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: DARK_SURFACE_BORDER,
                boxShadow: DARK_SURFACE_SHADOW,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border: DARK_SURFACE_BORDER,
                boxShadow: DARK_SURFACE_SHADOW,
              },
            },
          },
        },
      },
      (materialMultiLanguages as MaterialMultiLanguagesType)[MUI_LANG_MAP[lang] || 'enUS'],
    );

  return <ThemeProvider theme={theme(BROWSER_LANG)}>{children}</ThemeProvider>;
}

export default B3ThemeProvider;
