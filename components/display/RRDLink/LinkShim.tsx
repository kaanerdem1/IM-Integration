import { useNavigate } from 'react-router';

export const LinkShim = ({
  to,
  children,
  onClick,
  ...rest
}: {
  to: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLAnchorElement>) => {
  const navigate = useNavigate();

  return (
    <a
      {...rest}
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) {
          return;
        }
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
};
