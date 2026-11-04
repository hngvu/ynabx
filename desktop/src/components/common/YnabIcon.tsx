import React from 'react';

interface YnabIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}

export const YnabIcon: React.FC<YnabIconProps> = ({
  name,
  size = 16,
  className = '',
  title,
  ...rest
}) => {
  const iconId = name.startsWith('icon_sprite_') ? name : `icon_sprite_${name}`;

  return (
    <svg
      className={`ynab-new-icon ${className}`.trim()}
      width={size}
      height={size}
      aria-hidden={!title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#${iconId}`} />
    </svg>
  );
};
