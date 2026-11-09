import React from 'react';

export interface TopLayoutProps {
  children: React.ReactNode;
  loggedIn?: boolean;
}

/**
 * Exact decompiled from components/top-layout/index.hbs (xQ class):
 * <div className="layout">
 *   <div className="content-layout user-logged-in">
 *     {props.children}
 *   </div>
 * </div>
 */
export function TopLayout({ children, loggedIn = true }: TopLayoutProps) {
  return (
    <div className="layout">
      <div className={`content-layout ${loggedIn ? 'user-logged-in' : 'user-logged-out'}`}>
        {children}
      </div>
    </div>
  );
}

export default TopLayout;
