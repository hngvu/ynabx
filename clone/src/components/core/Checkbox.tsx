import React from 'react';
import { Icon } from './Icon';

export interface CheckboxProps {
  isChecked?: boolean;
  isPartiallyChecked?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  onChange?: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Exact decompiled from components/checkbox/index.gts (VI class):
 * classNames: `ynab-checkbox ynab-checkbox-button ${this.disabled ? "is-disabled" : ""} ${this.isChecked ? "is-checked" : ""}`
 */
export function Checkbox({
  isChecked = false,
  isPartiallyChecked = false,
  disabled = false,
  title,
  className = '',
  children,
  onChange,
  onClick,
}: CheckboxProps) {
  const checkedState = isChecked ? (isPartiallyChecked ? 'mixed' : 'true') : 'false';
  const classNames = `ynab-checkbox ynab-checkbox-button ${disabled ? 'is-disabled' : ''} ${isChecked ? 'is-checked' : ''} ${className}`.trim();

  return (
    <button
      className={classNames}
      role="checkbox"
      aria-checked={checkedState}
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onChange?.(!isChecked);
        onClick?.(e);
      }}
    >
      <Icon
        className={`ynab-checkbox-button-square ${isChecked ? 'is-checked' : ''} ${isPartiallyChecked ? 'is-partial' : ''}`}
        name={isPartiallyChecked ? 'subtract' : 'check'}
        width={13}
      />
      {children && (
        <div className="label-checkbox" title={title}>
          {children}
        </div>
      )}
    </button>
  );
}

export default Checkbox;
