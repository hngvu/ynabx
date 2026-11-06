import React from "react";

interface YnabIconProps {
  name: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const YnabIcon: React.FC<YnabIconProps> = ({
  name,
  width = 16,
  height = 16,
  className = "",
}) => {
  return (
    <svg
      className={`ynab-new-icon ${className}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <use href={`#icon_sprite_${name}`} xlinkHref={`#icon_sprite_${name}`} />
    </svg>
  );
};
