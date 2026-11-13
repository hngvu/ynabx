import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  width?: number | string;
  height?: number | string;
  title?: string;
  className?: string;
}

/**
 * Exact decompiled from components/icon/index.gts (zI class):
 * <svg className="ynab-new-icon" width={this.width} height={this.height} {...attrs}>
 *   {this.title && <title>{this.title}</title>}
 *   <use href={`#icon_sprite_${this.name}`} />
 *   {props.children}
 * </svg>
 */
export function Icon({
  name,
  width = 16,
  height,
  title,
  className = '',
  children,
  ...rest
}: IconProps) {
  const actualHeight = height ?? width;
  return (
    <svg
      className={`ynab-new-icon ${className}`.trim()}
      width={width}
      height={actualHeight}
      {...rest}
    >
      {title && <title>{title}</title>}
      <use href={`#icon_sprite_${name}`} />
      {children}
    </svg>
  );
}

export default Icon;
