import { ChangeEvent, useEffect, useState } from 'react';
import { Clear as ClearIcon, Search as SearchIcon } from '@mui/icons-material';
import { InputBase, Paper, useTheme } from '@mui/material';

import { useDebounce } from '@/hooks/useDebounce';
import { useB3Lang } from '@/lib/lang';

interface B3FilterSearchProps {
  handleChange: (value: string) => void;
  w?: number | undefined | string;
  searchBGColor?: string;
  placeholder?: string;
  h?: number | string;
  searchValue?: string;
}

function B3FilterSearch({
  handleChange,
  w = '100%',
  h,
  searchBGColor,
  searchValue = '',
  ...restProps
}: B3FilterSearchProps) {
  const [search, setSearch] = useState<string>('');
  const theme = useTheme();
  const b3Lang = useB3Lang();
  const debouncedValue = useDebounce<string>(search, 500);
  const { placeholder = b3Lang('global.filter.search') } = restProps;
  const backgroundColor = searchBGColor || theme.palette.background.paper;

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleClearSearchValue = () => {
    setSearch('');
  };

  // debounce
  useEffect(() => {
    handleChange(search);
    // disabling this rule as we need to wait for debounceValue change, to search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);
  useEffect(() => {
    if (searchValue.length > 0) {
      setSearch(searchValue);
    }
  }, [searchValue]);

  return (
    <Paper
      component="div"
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: w,
        maxWidth: w,
        border: 'none',
        boxShadow: 'none',
        height: h || '50px',
        borderBottomLeftRadius: '0',
        borderBottomRightRadius: '0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.42)',
        backgroundColor,
      }}
    >
      <SearchIcon
        sx={{
          p: '10px',
          color: 'text.secondary',
          fontSize: '2.7rem',
        }}
      />
      <InputBase
        sx={{
          ml: 1,
          flex: 1,
          color: 'text.primary',
          '& .MuiInputBase-input': {
            pb: 0,
            color: 'text.primary',
            '&::placeholder': {
              color: 'text.secondary',
              opacity: 1,
            },
          },
        }}
        size="small"
        value={search}
        placeholder={placeholder}
        onChange={handleOnChange}
        endAdornment={
          search.length > 0 && (
            <ClearIcon
              sx={{
                marginRight: '8px',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '1.8rem',
                color: 'text.secondary',
                ':hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '48px',
                },
              }}
              onClick={handleClearSearchValue}
            />
          )
        }
      />
    </Paper>
  );
}

export default B3FilterSearch;
