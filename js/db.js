/**
 * db.js — Local data persistence layer
 * All data is stored in localStorage as a single JSON blob.
 * This acts as a lightweight client-side database.
 */

const DB_KEY = 'ledger_accounting_db';

const AccountTypes = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expense'
};

// Default chart of accounts — standard small-business structure
const DEFAULT_COA = [
  // Assets
  { id: '1000', code: '1000', name: 'Cash', type: 'Asset', subtype: 'Current Asset' },
  { id: '1010', code: '1010', name: 'Bank Account', type: 'Asset', subtype: 'Current Asset' },
  { id: '1200', code: '1200', name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset' },
  { id: '1500', code: '1500', name: 'Inventory', type: 'Asset', subtype: 'Current Asset' },
  { id: '1700', code: '1700', name: 'Equipment', type: 'Asset', subtype: 'Fixed Asset' },
  { id: '1750', code: '1750', name: 'Accumulated Depreciation', type: 'Asset', subtype: 'Fixed Asset' },
  // Liabilities
  { id: '2000', code: '2000', name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability' },
  { id: '2100', code: '2100', name: 'Accrued Expenses', type: 'Liability', subtype: 'Current Liability' },
  { id: '2500', code: '2500', name: 'Bank Loan', type: 'Liability', subtype: 'Long-term Liability' },
  // Equity
  { id: '3000', code: '3000', name: "Owner's Capital", type: 'Equity', subtype: 'Equity' },
  { id: '3100', code: '3100', name: "Owner's Drawings", type: 'Equity', subtype: 'Equity' },
  { id: '3900', code: '3900', name: 'Retained Earnings', type: 'Equity', subtype: 'Equity' },
  // Revenue
  { id: '4000', code: '4000', name: 'Sales Revenue', type: 'Revenue', subtype: 'Operating Revenue' },
  { id: '4100', code: '4100', name: 'Service Revenue', type: 'Revenue', subtype: 'Operating Revenue' },
  { id: '4900', code: '4900', name: 'Interest Income', type: 'Revenue', subtype: 'Other Revenue' },
  // Expenses
  { id: '5000', code: '5000', name: 'Cost of Goods Sold', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6000', code: '6000', name: 'Salaries & Wages', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6100', code: '6100', name: 'Rent Expense', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6200', code: '6200', name: 'Utilities', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6300', code: '6300', name: 'Office Supplies', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6400', code: '6400', name: 'Marketing & Advertising', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6500', code: '6500', name: 'Depreciation Expense', type: 'Expense', subtype: 'Operating Expense' },
  { id: '6900', code: '6900', name: 'Bank Charges', type: 'Expense', subtype: 'Operating Expense' },
];

function getDefaultDB() {
  return {
    meta: { companyName: 'My Company', fiscalYearStart: '01-01', currency: 'USD', createdAt: Date.now() },
    accounts: DEFAULT_COA,
    journalEntries: [],
    contacts: [],
    invoices: [],
    bills: [],
    transactions: [], // bank transactions
    nextId: { entry: 1, contact: 1, invoice: 1, bill: 1, txn: 1 }
  };
}

const DB = {
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const fresh = getDefaultDB();
        this.save(fresh);
        return fresh;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('DB load error', e);
      return getDefaultDB();
    }
  },

  save(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  },

  reset() {
    localStorage.removeItem(DB_KEY);
    return this.load();
  },

  // ---- Accounts ----
  getAccounts() { return this.load().accounts; },
  getAccount(id) { return this.getAccounts().find(a => a.id === id); },
  addAccount(account) {
    const data = this.load();
    account.id = account.code;
    data.accounts.push(account);
    this.save(data);
    return account;
  },
  updateAccount(id, updates) {
    const data = this.load();
    const acc = data.accounts.find(a => a.id === id);
    if (acc) Object.assign(acc, updates);
    this.save(data);
  },
  deleteAccount(id) {
    const data = this.load();
    // Check if account is used in journal entries
    const used = data.journalEntries.some(e => e.lines.some(l => l.accountId === id));
    if (used) return { error: 'Cannot delete account used in journal entries. Archive it instead.' };
    data.accounts = data.accounts.filter(a => a.id !== id);
    this.save(data);
    return { ok: true };
  },

  // ---- Journal Entries ----
  getJournalEntries() { return this.load().journalEntries; },
  getJournalEntry(id) { return this.getJournalEntries().find(e => e.id === id); },
  addJournalEntry(entry) {
    const data = this.load();
    entry.id = 'JE-' + String(data.nextId.entry++).padStart(5, '0');
    entry.createdAt = Date.now();
    data.journalEntries.push(entry);
    this.save(data);
    return entry;
  },
  deleteJournalEntry(id) {
    const data = this.load();
    data.journalEntries = data.journalEntries.filter(e => e.id !== id);
    this.save(data);
  },

  // ---- Contacts ----
  getContacts(type) {
    const contacts = this.load().contacts;
    return type ? contacts.filter(c => c.type === type) : contacts;
  },
  getContact(id) { return this.getContacts().find(c => c.id === id); },
  addContact(contact) {
    const data = this.load();
    contact.id = 'C-' + String(data.nextId.contact++).padStart(5, '0');
    contact.createdAt = Date.now();
    data.contacts.push(contact);
    this.save(data);
    return contact;
  },
  updateContact(id, updates) {
    const data = this.load();
    const c = data.contacts.find(c => c.id === id);
    if (c) Object.assign(c, updates);
    this.save(data);
  },
  deleteContact(id) {
    const data = this.load();
    data.contacts = data.contacts.filter(c => c.id !== id);
    this.save(data);
  },

  // ---- Invoices ----
  getInvoices() { return this.load().invoices; },
  getInvoice(id) { return this.getInvoices().find(i => i.id === id); },
  addInvoice(invoice) {
    const data = this.load();
    invoice.id = 'INV-' + String(data.nextId.invoice++).padStart(5, '0');
    invoice.createdAt = Date.now();
    data.invoices.push(invoice);
    this.save(data);
    return invoice;
  },
  updateInvoice(id, updates) {
    const data = this.load();
    const inv = data.invoices.find(i => i.id === id);
    if (inv) Object.assign(inv, updates);
    this.save(data);
  },
  deleteInvoice(id) {
    const data = this.load();
    data.invoices = data.invoices.filter(i => i.id !== id);
    this.save(data);
  },

  // ---- Bills ----
  getBills() { return this.load().bills; },
  getBill(id) { return this.getBills().find(b => b.id === id); },
  addBill(bill) {
    const data = this.load();
    bill.id = 'BILL-' + String(data.nextId.bill++).padStart(5, '0');
    bill.createdAt = Date.now();
    data.bills.push(bill);
    this.save(data);
    return bill;
  },
  updateBill(id, updates) {
    const data = this.load();
    const b = data.bills.find(b => b.id === id);
    if (b) Object.assign(b, updates);
    this.save(data);
  },
  deleteBill(id) {
    const data = this.load();
    data.bills = data.bills.filter(b => b.id !== id);
    this.save(data);
  },

  // ---- Settings ----
  getSettings() { return this.load().meta; },
  updateSettings(updates) {
    const data = this.load();
    Object.assign(data.meta, updates);
    this.save(data);
  },
};
