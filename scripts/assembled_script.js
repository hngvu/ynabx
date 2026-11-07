
    // 1. View Switcher
    function switchView(viewName) {
      document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

      if (viewName === 'budget') {
        document.getElementById('view-budget').classList.add('active');
        document.getElementById('btn-tab-budget').classList.add('active');
      } else if (viewName === 'reflect') {
        document.getElementById('view-reflect').classList.add('active');
        document.getElementById('btn-tab-reflect').classList.add('active');
      } else if (viewName === 'accounts') {
        document.getElementById('view-accounts').classList.add('active');
        document.getElementById('btn-tab-accounts').classList.add('active');
      }
    }

    // 2. Modal Manager
    function openModal(id) {
      const wrapper = document.getElementById('modal-wrapper');
      wrapper.style.display = 'flex';
      document.querySelectorAll('.modal-item').forEach(m => m.style.display = 'none');
      const target = document.getElementById('modal-' + id);
      if (target) {
        target.style.display = 'block';
      }
    }

    function closeModal() {
      const wrapper = document.getElementById('modal-wrapper');
      wrapper.style.display = 'none';
      document.querySelectorAll('.modal-item').forEach(m => m.style.display = 'none');
    }

    function handleBackdropClick(e) {
      if (e.target.id === 'modal-wrapper' || e.target.classList.contains('modal-overlay')) {
        closeModal();
      }
    }

    // 3. Dynamic Inspector Switcher
    function setInspectorContent(templateId) {
      const liveInspector = document.querySelector('#view-budget .budget-inspector');
      const tpl = document.getElementById(templateId);
      if (liveInspector && tpl) {
        liveInspector.innerHTML = tpl.innerHTML;
        bindInspectorInteractions();
      }
    }

    function bindInspectorInteractions() {
      // Auto-assign expand toggle
      const autoAssignToggle = document.querySelector('#view-budget .budget-breakdown-auto-assign .card-roll-up, #view-budget .budget-breakdown-auto-assign button.card-roll-up');
      if (autoAssignToggle) {
        autoAssignToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = document.querySelector('#view-budget .budget-breakdown-auto-assign');
          if (card) card.classList.toggle('is-collapsed');
        });
      }

      // Assign button in Inspector impact message
      const assignBtn = document.querySelector('#view-budget .impact-message button.ynab-button');
      if (assignBtn) {
        assignBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          alert("✔ Đã kích hoạt [Assign $1,400.00] để tài trợ hoàn tất mục tiêu cho danh mục này!");
          setInspectorContent('tpl-inspector-funded');
        });
      }

      // Edit category button in Inspector
      const editCatBtn = document.querySelector('#view-budget .inspector-category-edit, #view-budget button[aria-label*="Edit category"]');
      if (editCatBtn) {
        editCatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('catEdit');
        });
      }

      // Recent moves button in Inspector
      const recentMovesBtn = document.querySelector('#view-budget .recent-moves-open-modal-container button');
      if (recentMovesBtn) {
        recentMovesBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('recentMoves');
        });
      }
    }

    // 4. Initialize Interactive Attachments
    document.addEventListener('DOMContentLoaded', () => {
      // Connect Sidebar Links
      document.querySelectorAll("a[href*='/budget']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('budget'); });
      });
      document.querySelectorAll("a[href*='/reflect']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('reflect'); });
      });
      document.querySelectorAll("a[href*='/accounts']").forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); switchView('accounts'); });
      });

      // Connect Category Row Clicks
      document.querySelectorAll('#view-budget .budget-table-row:not(.is-master-category)').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          // Deselect previous
          document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
          row.classList.add('is-checked');

          const name = (row.querySelector('.budget-table-cell-name') || {}).innerText || '';
          if (name.includes('Groceries') || name.includes('Gas') || name.includes('Entertainment')) {
            setInspectorContent('tpl-inspector-funded');
          } else {
            setInspectorContent('tpl-inspector-underfunded');
          }
        });
      });

      // Clicking outside category rows deselects to month inspector
      document.querySelector('#view-budget .budget-table-header')?.addEventListener('click', () => {
        document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
        setInspectorContent('tpl-inspector-month');
      });

      // Move Money Popover on Available Balance Click
      document.querySelectorAll('#view-budget .budget-table-cell-available').forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('moveMoney');
        });
      });

      // Calculator Mode on Assigned Cell Click
      document.querySelectorAll('#view-budget .budget-table-cell-budgeted').forEach(cell => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          const curr = cell.querySelector('.ynab-new-currency-input');
          if (curr) {
            curr.classList.add('is-focused', 'is-editing');
            const input = curr.querySelector('input');
            if (input) input.focus();
          }
        });
      });

      // Month Header Click -> Month Picker
      document.querySelectorAll('#view-budget .budget-header-calendar-date-button, #view-budget .button-calendar-date').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('monthPicker');
        });
      });

      // Reconcile Button & Steps
      document.querySelectorAll('#view-accounts button:has-text("Reconcile"), #view-accounts .button-reconcile').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('reconcile');
        });
      });

      document.querySelectorAll('#modal-reconcile button').forEach(b => {
        if (b.innerText.trim().toLowerCase() === 'no') {
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('reconcile-step2');
          });
        }
      });

      // Escape key closes modals & deselects rows
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.querySelectorAll('#view-budget .budget-table-row').forEach(r => r.classList.remove('is-checked'));
          setInspectorContent('tpl-inspector-month');
        }
      });

      // Bind initial inspector
      bindInspectorInteractions();
    });
  
    
    
    // Account register checkbox & action bar interaction
    function initAccountInteractions() {
      const checkboxes = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-cell-checkbox');
      const actionBar = document.getElementById('live-action-bar');

      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = cb.tagName === 'BUTTON' ? cb : cb.querySelector('button') || cb;
          btn.classList.toggle('is-checked');
          
          const checkedCount = document.querySelectorAll('#view-accounts .ynab-grid-cell-checkbox .is-checked, #view-accounts .ynab-grid-cell-checkbox.is-checked').length;

          if (checkedCount > 0 && actionBar) {
            actionBar.style.display = 'block';
            const countBtn = actionBar.querySelector('.register-action-bar-inner button:first-child');
            if (countBtn) {
              countBtn.innerText = '× ' + checkedCount + (checkedCount === 1 ? ' Transaction' : ' Transactions');
            }
          } else if (actionBar) {
            actionBar.style.display = 'none';
          }
        });
      });

      // Action Bar Button Click Handlers
      if (actionBar) {
        const allButtons = Array.from(actionBar.querySelectorAll('button'));
        
        // More button
        const moreBtn = allButtons.find(b => b.innerText.includes('More')) || allButtons[allButtons.length - 1];
        if (moreBtn) {
          moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarMore');
          });
        }

        // Categorize button
        const catBtn = allButtons.find(b => b.innerText.includes('Categorize'));
        if (catBtn) {
          catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarCategorize');
          });
        }

        // Flag button
        const flagBtn = allButtons.find(b => b.innerText.includes('Flag'));
        if (flagBtn) {
          flagBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarFlag');
          });
        }

        // Close action bar button
        const closeBtn = allButtons.find(b => b.innerText.includes('Transaction'));
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#view-accounts .is-checked').forEach(el => el.classList.remove('is-checked'));
            actionBar.style.display = 'none';
          });
        }
      }

      // Add Transaction row interactions
      const dateCell = document.querySelector('#view-accounts .ynab-grid-cell-date input, #view-accounts .ynab-grid-cell-date');
      if (dateCell) {
        dateCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('datePicker');
        });
      }

      const payeeCell = document.querySelector('#view-accounts .ynab-grid-cell-payeeName input, #view-accounts .ynab-grid-cell-payeeName');
      if (payeeCell) {
        payeeCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('payeeDropdown');
        });
      }

      const catCell = document.querySelector('#view-accounts .ynab-grid-cell-subCategoryName input, #view-accounts .ynab-grid-cell-subCategoryName');
      if (catCell) {
        catCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('catDropdown');
        });
      }
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initAccountInteractions);
    } else {
      initAccountInteractions();
    }

  