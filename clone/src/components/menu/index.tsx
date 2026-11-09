import React from 'react';
import { Icon } from '../core/Icon';

export interface MenuItemProps {
  id?: string;
  className?: string;
  href?: string;
  disabled?: boolean;
  leadingIcon?: string;
  subtext?: string;
  disclosure?: boolean;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

/**
 * Exact decompiled from components/menu/item.gts (lines 12602000-12603200):
 * Direct flat children: Icon, label/children, disclosure Icon.
 */
export function MenuItem({
  id,
  className = '',
  href,
  disabled = false,
  leadingIcon,
  subtext,
  disclosure = false,
  target,
  rel,
  onClick,
  children,
}: MenuItemProps) {
  const combinedClass = `menu-item js-menu-item ${className}`.trim();

  const content = (
    <>
      {leadingIcon && (
        <Icon name={leadingIcon} width={16} />
      )}
      {subtext ? (
        <div className="menu-item-subtext">
          <div>{children}</div>
          <div>{subtext}</div>
        </div>
      ) : (
        children
      )}
      {disclosure && (
        <Icon
          name="chevron_right"
          className="menu-item-disclosure"
          width={12}
        />
      )}
    </>
  );

  if (href) {
    return (
      <a
        id={id}
        href={href}
        target={target}
        rel={rel}
        className={combinedClass}
        role="menuitem"
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      id={id}
      type="button"
      className={combinedClass}
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export function MenuHeading({ children }: { children: React.ReactNode }) {
  return <div className="menu-heading">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu-separator" role="separator" />;
}

export interface MenuProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}

export function Menu({ id, className = '', style, onScroll, children }: MenuProps) {
  return (
    <div
      id={id}
      className={`menu js-menu ${className}`.trim()}
      role="menu"
      style={style}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}

Menu.Item = MenuItem;
Menu.Heading = MenuHeading;
Menu.Separator = MenuSeparator;

export default Menu;
