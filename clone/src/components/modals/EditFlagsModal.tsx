import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { FieldWithError } from '../core/FieldWithError';

export interface FlagSetting {
  id: string;
  color: string;
  iconClass: string;
  name: string;
  elementId: string;
  errorFieldName: string;
}

const DEFAULT_FLAGS: FlagSetting[] = [
  { id: 'Red', color: 'Red', iconClass: 'red', name: 'Red', elementId: 'flag-name_red', errorFieldName: 'redFlagNameError' },
  { id: 'Orange', color: 'Orange', iconClass: 'orange', name: 'Orange', elementId: 'flag-name_orange', errorFieldName: 'orangeFlagNameError' },
  { id: 'Yellow', color: 'Yellow', iconClass: 'yellow', name: 'Yellow', elementId: 'flag-name_yellow', errorFieldName: 'yellowFlagNameError' },
  { id: 'Green', color: 'Green', iconClass: 'green', name: 'Green', elementId: 'flag-name_green', errorFieldName: 'greenFlagNameError' },
  { id: 'Blue', color: 'Blue', iconClass: 'blue', name: 'Blue', elementId: 'flag-name_blue', errorFieldName: 'blueFlagNameError' },
  { id: 'Purple', color: 'Purple', iconClass: 'purple', name: 'Purple', elementId: 'flag-name_purple', errorFieldName: 'purpleFlagNameError' },
];

export interface EditFlagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (flagNames: Record<string, string>) => void;
}

/**
 * Exact decompiled from components/modals/flag-names.hbs (iut class):
 * <Modal className="ynab-u modal-fresh modal-flag-names" close={this.modalService.closeModal}>
 *   <modal.header>Edit Flags</modal.header>
 *   <modal.body>
 *     ...flag-name-input-group...
 *   </modal.body>
 *   <modal.footer>
 *     <Button onClick={closeModal} variant="secondary">Cancel</Button>
 *     <Button onClick={saveFlagNames} variant="primary">Done</Button>
 *   </modal.footer>
 * </Modal>
 */
export function EditFlagsModal({ isOpen, onClose, onSave }: EditFlagsModalProps) {
  if (!isOpen) return null;

  const [flags, setFlags] = useState<FlagSetting[]>(DEFAULT_FLAGS);

  const handleTextChange = (color: string, val: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.color === color ? { ...f, name: val } : f))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const result: Record<string, string> = {};
    flags.forEach((f) => {
      if (f.name.trim().toLowerCase() !== f.color.toLowerCase()) {
        result[f.color] = f.name.trim();
      }
    });
    onSave?.(result);
    onClose();
  };

  return (
    <Modal className="ynab-u modal-fresh modal-flag-names" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Edit Flags</Modal.Header>
      <Modal.Body>
        <div className="fieldset">
          <form onSubmit={handleSave}>
            {flags.map((setting) => (
              <div key={setting.id} className="flag-name-input-group">
                <FieldWithError field={setting.errorFieldName}>
                  <label htmlFor={setting.elementId}>
                    <Icon
                      className={`ynab-flag-icon ${setting.iconClass}`}
                      name="flag_fill"
                      width={22}
                      height={22}
                    />
                  </label>
                  <input
                    aria-label={setting.color}
                    id={setting.elementId}
                    placeholder={setting.color}
                    maxLength={100}
                    type="text"
                    value={setting.name}
                    onChange={(e) => handleTextChange(setting.color, e.target.value)}
                  />
                </FieldWithError>
              </div>
            ))}
          </form>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="primary">
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditFlagsModal;
