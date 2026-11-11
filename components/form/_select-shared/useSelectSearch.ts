import { useEffect, useEffectEvent, useRef } from 'react';
import { useDebouncedCallback, useUncontrolled } from '@mantine/hooks';

export type RemoteSelectSearchProps = {
  /** Called with typed text after the debounce; selection labels are never searched. */
  onSearch?: (text: string) => void;
};

export const useSelectSearch = ({
  defaultSearchValue,
  onSearch,
  onSearchChange,
  searchValue,
}: RemoteSelectSearchProps & {
  defaultSearchValue?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
}) => {
  const [localSearch, setLocalSearch] = useUncontrolled<string | undefined>({
    value: searchValue,
    onChange: (value) => onSearchChange?.(value ?? ''),
  });
  const typedSearch = useRef('');
  const search = useDebouncedCallback((text: string) => onSearch?.(text), 300);

  const resetSearch = () => {
    search.cancel();
    if (typedSearch.current) {
      typedSearch.current = '';
      onSearch?.('');
    }
  };

  const resetSearchOnUnmount = useEffectEvent(resetSearch);
  useEffect(() => () => resetSearchOnUnmount(), []);

  const searchTypedText = (text: string) => {
    if (text === typedSearch.current) {
      return;
    }

    if (!text) {
      resetSearch();
      return;
    }

    typedSearch.current = text;
    if (onSearch) {
      search(text);
    }
  };

  return {
    searchValue: localSearch ?? defaultSearchValue ?? '',
    setSearchValue: (value: string) => {
      setLocalSearch(value);
      if (!value) {
        resetSearch();
      }
    },
    searchTypedText,
    resetSearch,
  };
};
