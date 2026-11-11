import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  ActionIcon,
  Indicator,
  Tooltip,
  type ActionIconProps,
  type IndicatorProps,
} from '@mantine/core';

type ToolbarActionIconProps = ActionIconProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'color' | 'style'> & {
    /** Etkin durum (ör. uygulanmış filtre): açık zemin ve köşede nokta */
    active?: boolean;
    icon: ReactNode;
    indicatorColor?: IndicatorProps['color'];
    /** Tooltip ve erişilebilirlik etiketi; buton metin taşımaz */
    label: string;
  };

// Liste araç çubuğu ikon butonu: yalnızca ikon, metin tooltip'te; Menu.Target içinde kullanılabilir
export const ToolbarActionIcon = forwardRef<HTMLButtonElement, ToolbarActionIconProps>(
  ({ active = false, icon, indicatorColor = 'cyan', label, ...props }, ref) => (
    <Indicator color={indicatorColor} disabled={!active} inline offset={3} size={7}>
      <Tooltip
        label={label}
        withArrow
        disabled={props['aria-expanded'] === true || props['aria-expanded'] === 'true'}
      >
        <ActionIcon
          ref={ref}
          aria-label={label}
          color="gray"
          radius="xl"
          size={30}
          variant={active ? 'light' : 'subtle'}
          {...props}
        >
          {icon}
        </ActionIcon>
      </Tooltip>
    </Indicator>
  )
);

ToolbarActionIcon.displayName = 'ToolbarActionIcon';
