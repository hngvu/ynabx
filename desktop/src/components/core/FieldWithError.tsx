import React from 'react';

export interface FieldWithErrorProps {
  field?: string;
  errors?: Record<string, string | string[]>;
  warnings?: Record<string, string | string[]>;
  styleType?: 'formField' | 'base';
  errorsId?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Exact decompiled from components/field-with-error.hbs (b4 class)
 */
export function FieldWithError({
  field = '',
  errors,
  warnings,
  styleType = 'formField',
  errorsId,
  className = '',
  children,
}: FieldWithErrorProps) {
  const getMessages = (dict?: Record<string, string | string[]>) => {
    if (!dict || !field) return [];
    const val = dict[field];
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const errorMessages = getMessages(errors);
  const warningMessages = getMessages(warnings);
  const hasErrors = errorMessages.length > 0;
  const hasWarnings = warningMessages.length > 0;
  const baseError = styleType === 'base';

  return (
    <div
      className={`field-with-error ${hasErrors ? 'has-errors' : ''} ${hasWarnings ? 'has-warnings' : ''} ${baseError ? 'base-error' : ''} ${className}`.trim()}
    >
      <div>{children}</div>
      {hasErrors && (
        <ul className="errors" id={errorsId}>
          {errorMessages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
      {hasWarnings && (
        <ul className="warnings">
          {warningMessages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FieldWithError;
