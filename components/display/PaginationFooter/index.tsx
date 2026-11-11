import { Pagination } from '@mantine/core';
import { View } from '@/components/display/View';

interface Props {
  totalPages: number;
  pageNumber: number;
  onChange: (pageNumber: number) => void;
  disabled?: boolean;
}

export const PaginationFooter = ({ totalPages, pageNumber, onChange, disabled }: Props) => {
  return (
    <View show={totalPages > 1}>
      <Pagination
        size="sm"
        radius="sm"
        total={totalPages}
        value={pageNumber + 1}
        onChange={(value) => onChange(value - 1)}
        disabled={disabled}
      />
    </View>
  );
};
