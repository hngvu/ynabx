import React, { useState } from 'react';
import { Modal } from '../core/Modal';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

export interface PayeeItem {
  id: string;
  name: string;
  autoCategory?: string;
}

const DEFAULT_PAYEES: PayeeItem[] = [
  { id: 'payee-1', name: 'Starting Balance', autoCategory: 'Inflow: Ready to Assign' },
  { id: 'payee-2', name: 'Greenway Apartments', autoCategory: 'Rent' },
  { id: 'payee-3', name: 'Whole Foods Market', autoCategory: 'Groceries' },
  { id: 'payee-4', name: 'Netflix', autoCategory: 'Subscriptions' },
  { id: 'payee-5', name: 'Shell Oil', autoCategory: 'Transportation' },
];

export interface ManagePayeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (payees: PayeeItem[]) => void;
}

/**
 * Exact decompiled from components/modals/manage-payees.hbs (zct class):
 * <Modal className="modal-payees" size="xx-large" alwaysShowFooterBorder={true} close={this.closeManagePayees}>
 *   <Header>Manage Payees</Header>
 *   <Body>LegacyFormFields with Payees list</Body>
 *   <Footer><UndoRedoButtons /><Button>Done</Button></Footer>
 * </Modal>
 */
export function ManagePayeesModal({ isOpen, onClose, onSave }: ManagePayeesModalProps) {
  if (!isOpen) return null;

  const [payees, setPayees] = useState<PayeeItem[]>(DEFAULT_PAYEES);
  const [search, setSearch] = useState('');
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>(DEFAULT_PAYEES[0].id);

  const filteredPayees = payees.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activePayee = payees.find((p) => p.id === selectedPayeeId) || payees[0];

  const handleUpdateName = (newName: string) => {
    setPayees((prev) =>
      prev.map((p) => (p.id === activePayee.id ? { ...p, name: newName } : p))
    );
  };

  const handleDelete = () => {
    if (payees.length <= 1) return;
    const remaining = payees.filter((p) => p.id !== activePayee.id);
    setPayees(remaining);
    setSelectedPayeeId(remaining[0].id);
  };

  const handleDone = () => {
    onSave?.(payees);
    onClose();
  };

  return (
    <Modal className="modal-payees" onClose={onClose} arrow="none">
      <Modal.Header close={onClose}>Manage Payees</Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', height: '420px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          {/* Left Column: Search & Payee List */}
          <div style={{ width: '260px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="Filter payees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredPayees.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPayeeId(p.id)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: p.id === selectedPayeeId ? '#e0f2fe' : 'transparent',
                    fontWeight: p.id === selectedPayeeId ? 600 : 400,
                    color: p.id === selectedPayeeId ? '#0369a1' : '#334155',
                  }}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Edit Payee Details */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            {activePayee && (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Payee Details</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Payee Name
                  </label>
                  <input
                    type="text"
                    value={activePayee.name}
                    onChange={(e) => handleUpdateName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Default Category
                  </label>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {activePayee.autoCategory || 'No default category assigned'}
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete Payee
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
        <Button onClick={handleDone} variant="primary">Done</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ManagePayeesModal;
