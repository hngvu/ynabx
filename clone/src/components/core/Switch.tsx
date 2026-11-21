import React from 'react';

export interface SwitchProps {
  isOn?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Switch: React.FC<SwitchProps> = ({
  isOn = false,
  disabled = false,
  onClick,
  className = '',
  children,
}) => {
  return (
    <button
      className={`ynab-switch ${isOn ? 'on' : 'off'} ${disabled ? 'disabled' : ''} ${className}`.trim()}
      disabled={disabled}
      type="button"
      role="checkbox"
      aria-checked={isOn ? 'true' : 'false'}
      onClick={disabled ? undefined : onClick}
    >
      <svg className="switch-toggle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 24" width="40" height="24">
        <rect width="40" height="24" rx="12" />
        <circle cx={isOn ? 28 : 12} cy="12" r="10" />
      </svg>
      {children}
    </button>
  );
};

export default Switch;
