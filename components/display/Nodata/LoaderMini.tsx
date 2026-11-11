import { Center, Loader, type CenterProps, type LoaderProps } from '@mantine/core';

export const LoaderMini = ({
  style,
  type = 'dots',
  ...props
}: Omit<CenterProps, 'children'> & { type?: LoaderProps['type'] }) => (
  <Center
    {...props}
    data-loading
    style={[
      style,
      { display: 'flex', alignItems: 'flex-start', alignSelf: 'stretch', justifySelf: 'stretch' },
    ]}
  >
    <Loader size="sm" mx="md" mt="var(--loading-top-offset, 24px)" mb={8} type={type} />
  </Center>
);
