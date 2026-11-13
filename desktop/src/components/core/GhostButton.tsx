import React from 'react';

export type GhostButtonVariant = 'primary' | 'secondary' | 'destructive' | 'transparent';
export type GhostButtonTypeSize = 'body' | 'large';

export interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GhostButtonVariant;
  disabled?: boolean;
  typeSize?: GhostButtonTypeSize;
  isIconOnly?: boolean;
  isDropdown?: boolean;
  href?: string;
  className?: string;
}

/**
 * Exact decompiled from components/ghost-button/index.gts ($M class)
 */
export function GhostButton({
  variant = 'secondary',
  disabled = false,
  typeSize = 'body',
  isIconOnly = false,
  isDropdown = false,
  href,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}: GhostButtonProps) {
  const buttonClassNames = [
    'ghost-button',
    variant,
    isIconOnly ? 'is-icon-only' : null,
    isDropdown ? 'is-dropdown' : null,
    typeSize === 'body' ? 'type-body' : 'type-body-large',
    className || null,
  ]
    .filter(Boolean)
    .join(' ');

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

export default GhostButton;
