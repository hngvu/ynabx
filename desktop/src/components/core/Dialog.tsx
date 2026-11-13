import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export interface DialogProps {
  id?: string;
  className?: string;
  active?: boolean;
  size?: 'regular' | 'large' | 'x-large' | 'xx-large';
  undismissable?: boolean;
  alwaysShowFooterBorder?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export function DialogHeader({
  children,
  close,
  undismissable = false,
  className = '',
}: {
  children: React.ReactNode;
  close?: () => void;
  undismissable?: boolean;
  className?: string;
}) {
  return (
    <div className={`dialog-header ${className}`.trim()}>
      <div className="dialog-title">{children}</div>
      {!undismissable && (
        <button
          className="dialog-close"
          aria-label="Close"
          title="Close"
          type="button"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

export function DialogHero({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`dialog-hero ${className}`.trim()}>{children}</div>;
}

export function DialogBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`dialog-body ${className}`.trim()}>{children}</div>;
}

export function DialogFooter({
  children,
  footerBorder = false,
  className = '',
}: {
  children: React.ReactNode;
  footerBorder?: boolean;
  className?: string;
}) {
  return (
    <div className={`dialog-footer ${footerBorder ? 'footer-border' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

/**
 * Exact decompiled from components/dialog/index.gts (wM class):
 * <div class="dialog-overlay active">
 *   <div class="dialog regular" role="dialog" aria-modal="true" style="left: ..., top: ...">
 *     <div class="dialog-header">...</div>
 *     <div class="scroll-content">
 *       <div class="dialog-hero">...</div>
 *       <div class="dialog-body">...</div>
 *     </div>
 *     <div class="dialog-footer">...</div>
 *   </div>
 * </div>
 */
export function Dialog({
  id,
  className = '',
  active = true,
  size = 'regular',
  undismissable = false,
  alwaysShowFooterBorder = false,
  onClose,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Exact wM.adjustPosition: centers the dialog on window resize & checks overflow
  useEffect(() => {
    const adjustPosition = () => {
      const el = dialogRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.max(10, Math.round((window.innerWidth - rect.width) / 2));
      const top = Math.max(10, Math.round((window.innerHeight - rect.height) / 2));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;

      const scrollContent = el.querySelector('.scroll-content');
      if (scrollContent) {
        if (scrollContent.scrollHeight > scrollContent.clientHeight) {
          el.classList.add('overflowed');
        } else {
          el.classList.remove('overflowed');
        }
      }
    };

    adjustPosition();
    window.addEventListener('resize', adjustPosition);
    return () => window.removeEventListener('resize', adjustPosition);
  }, [children, size]);

  return (
    <div
      id={id}
      className={`dialog-overlay ${active ? 'active' : ''} ${className}`.trim()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose && !undismissable) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`dialog ${size}`}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          opacity: 1,
          transform: 'scale(1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

Dialog.Header = DialogHeader;
Dialog.Hero = DialogHero;
Dialog.Body = DialogBody;
Dialog.Footer = DialogFooter;

export default Dialog;
