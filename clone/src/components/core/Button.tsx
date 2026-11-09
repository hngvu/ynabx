import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'transparent' | 'contrast';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  disabled?: boolean;
  isLarge?: boolean;
  isIconOnly?: boolean;
  href?: string;
  className?: string;
}

/**
 * Exact decompiled from components/button/index.gts (OI class):
 * buttonClassNames: `ynab-button ${this.variant} ${this.args.isLarge ? "is-large" : ""} ${this.args.isIconOnly ? "is-icon-only" : ""}`
 */
export function Button({
  variant = 'secondary',
  disabled = false,
  isLarge = false,
  isIconOnly = false,
  href,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const buttonClassNames = `ynab-button ${variant} ${isLarge ? 'is-large' : ''} ${isIconOnly ? 'is-icon-only' : ''} ${className}`.trim();

  if (href) {
    return (
      <a
        className={buttonClassNames}
        href={href}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          if (onClick) onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={buttonClassNames}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
