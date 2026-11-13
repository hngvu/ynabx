import React from 'react';
import { Icon } from './Icon';

export interface ModalProps {
  id?: string;
  className?: string;
  active?: boolean;
  arrow?: 'none' | 'up' | 'down' | 'left' | 'right';
  arrowTransform?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function ModalHeader({
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
    <div className={`modal-fresh-header ${className}`.trim()}>
      <div className="modal-fresh-title">{children}</div>
      {!undismissable && (
        <button
          className="modal-fresh-close"
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

export function ModalHero({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`modal-fresh-hero ${className}`.trim()}>{children}</div>;
}

export function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`modal-fresh-body ${className}`.trim()}>{children}</div>;
}

export function ModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`modal-fresh-footer ${className}`.trim()}>{children}</div>;
}

/**
 * Exact decompiled from components/modal/index.hbs (B2 class):
 * <div className="modal-overlay active">
 *   <div className="modal" role="dialog" aria-modal="true">
 *     ...
 *   </div>
 * </div>
 */
export function Modal({
  id,
  className = '',
  active = true,
  arrow = 'none',
  arrowTransform,
  onClose,
  children,
}: ModalProps) {
  return (
    <div
      id={id}
      className={`modal-overlay ${active ? 'active' : ''} ${className}`.trim()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        {children}
        {arrow !== 'none' && (
          <svg className="modal-arrow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
              transform={arrowTransform}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

Modal.Header = ModalHeader;
Modal.Hero = ModalHero;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
