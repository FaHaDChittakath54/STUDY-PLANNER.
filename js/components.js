/**
 * components.js — Reusable UI components and modal helpers
 */

const Components = {
  toast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  confirm(message) {
    return window.confirm(message);
  },

  openModal(title, bodyHtml, options = {}) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${options.size === 'lg' ? 'modal-lg' : ''}" id="modal-box">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="Components.closeModal()">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    document.body.appendChild(overlay);
    return overlay;
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  },

  emptyState(icon, title, message, actionLabel, actionFn) {
    const id = 'empty-action-' + Math.random().toString(36).substr(2, 9);
    setTimeout(() => {
      const btn = document.getElementById(id);
      if (btn && actionFn) btn.onclick = actionFn;
    }, 0);
    return `
      <div class="empty-state">
        <div class="icon">${icon}</div>
        <h4>${title}</h4>
        <p>${message}</p>
        ${actionLabel ? `<button class="btn btn-primary" id="${id}" style="margin-top:16px">${actionLabel}</button>` : ''}
      </div>
    `;
  },

  badge(status) {
    const labels = {
      draft: 'Draft', sent: 'Sent', paid: 'Paid', unpaid: 'Unpaid',
      partial: 'Partial', overdue: 'Overdue', active: 'Active', inactive: 'Inactive'
    };
    let cls = status;
    if (status === 'unpaid') {
      // check if overdue will be handled by caller
      cls = 'unpaid';
    }
    return `<span class="badge badge-${cls}">${labels[status] || status}</span>`;
  },

  // Determine invoice/bill status for display
  getInvoiceStatus(invoice) {
    if (invoice.status === 'draft') return 'draft';
    if (invoice.status === 'paid' || (invoice.amountPaid || 0) >= invoice.total) return 'paid';
    if (invoice.amountPaid > 0) return 'partial';
    if (new Date(invoice.dueDate) < new Date()) return 'overdue';
    return 'unpaid';
  },

  getBillStatus(bill) {
    if (bill.status === 'paid' || (bill.amountPaid || 0) >= bill.total) return 'paid';
    if (bill.amountPaid > 0) return 'partial';
    if (new Date(bill.dueDate) < new Date()) return 'overdue';
    return 'unpaid';
  },
};
