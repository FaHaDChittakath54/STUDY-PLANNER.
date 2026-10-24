/**
 * app.js — Main application: routing, page rendering, and event handling
 */

const App = {
  currentPage: 'dashboard',
  currentTab: {},

  init() {
    DB.load(); // ensure default DB exists
    this.render();
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    this.currentPage = hash;
    this.render();
  },

  navigate(page) {
    window.location.hash = page;
    this.currentPage = page;
    this.render();
  },

  render() {
    const root = document.getElementById('app');
    const page = window.location.hash.slice(1) || 'dashboard';
    this.currentPage = page;
    root.innerHTML = this.layout();
    this.bindNav();
    this.renderPage(page);
  },

  layout() {
    const navItems = [
      { section: 'Overview', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
      ]},
      { section: 'Bookkeeping', items: [
        { id: 'journal', icon: '📝', label: 'Journal Entries' },
        { id: 'ledger', icon: '📖', label: 'General Ledger' },
        { id: 'accounts', icon: '🗂️', label: 'Chart of Accounts' },
      ]},
      { section: 'Sales & Purchases', items: [
        { id: 'invoices', icon: '📄', label: 'Invoices' },
        { id: 'bills', icon: '🧾', label: 'Bills & Expenses' },
        { id: 'contacts', icon: '👥', label: 'Contacts' },
      ]},
      { section: 'Reports', items: [
        { id: 'trial-balance', icon: '⚖️', label: 'Trial Balance' },
        { id: 'income-statement', icon: '📈', label: 'Income Statement' },
        { id: 'balance-sheet', icon: '📋', label: 'Balance Sheet' },
      ]},
      { section: 'System', items: [
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]},
    ];

    const navHtml = navItems.map(section => `
      <div class="nav-section">
        <div class="nav-section-label">${section.section}</div>
        ${section.items.map(item => `
          <div class="nav-item ${this.currentPage === item.id ? 'active' : ''}" onclick="App.navigate('${item.id}')">
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    const settings = DB.getSettings();
    return `
      <div class="layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo">L</div>
            <h1>Ledger</h1>
          </div>
          <nav class="nav">${navHtml}</nav>
        </aside>
        <main class="main" id="main-content">
          <button class="mobile-menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰ Menu</button>
          <div id="page-content"></div>
        </main>
      </div>
    `;
  },

  bindNav() {
    // nav items are already bound via onclick
  },

  renderPage(page) {
    const content = document.getElementById('page-content');
    if (!content) return;
    const pages = {
      'dashboard': () => Pages.dashboard(),
      'journal': () => Pages.journal(),
      'ledger': () => Pages.ledger(),
      'accounts': () => Pages.accounts(),
      'invoices': () => Pages.invoices(),
      'bills': () => Pages.bills(),
      'contacts': () => Pages.contacts(),
      'trial-balance': () => Pages.trialBalance(),
      'income-statement': () => Pages.incomeStatement(),
      'balance-sheet': () => Pages.balanceSheet(),
      'settings': () => Pages.settings(),
    };
    const fn = pages[page] || pages['dashboard'];
    content.innerHTML = fn();
  },

  fmt(amount) {
    return Accounting.formatMoney(amount);
  },
  fmtDate(dateStr) {
    return Accounting.formatDate(dateStr);
  },
};

// ============ PAGES ============
const Pages = {

  // ---- Dashboard ----
  dashboard() {
    const s = Accounting.getDashboardSummary();
    const recentEntries = DB.getJournalEntries().slice(-5).reverse();
    const recentInvoices = DB.getInvoices().slice(-5).reverse();

    const statCard = (label, value, sub, cls) => `
      <div class="stat-card">
        <div class="label">${label}</div>
        <div class="value ${cls || ''}">${this.fmt(value)}</div>
        ${sub ? `<div class="sub">${sub}</div>` : ''}
      </div>
    `;

    let entriesHtml = recentEntries.length ? `
      <table class="data-table">
        <thead><tr><th>Date</th><th>ID</th><th>Description</th><th class="text-right">Amount</th></tr></thead>
        <tbody>
          ${recentEntries.map(e => {
            const total = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
            return `<tr>
              <td>${App.fmtDate(e.date)}</td>
              <td>${e.id}</td>
              <td>${e.description}</td>
              <td class="text-right">${App.fmt(total)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('📝', 'No journal entries yet', 'Create your first journal entry to get started.', 'New Journal Entry', () => { App.navigate('journal'); });

    let invoicesHtml = recentInvoices.length ? `
      <table class="data-table">
        <thead><tr><th>Invoice #</th><th>Customer</th><th class="text-right">Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${recentInvoices.map(i => {
            const contact = DB.getContact(i.contactId);
            const status = Components.getInvoiceStatus(i);
            return `<tr>
              <td>${i.id}</td>
              <td>${contact ? contact.name : '—'}</td>
              <td class="text-right">${App.fmt(i.total)}</td>
              <td>${Components.badge(status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('📄', 'No invoices yet', 'Create your first invoice to track sales.', 'New Invoice', () => { App.navigate('invoices'); });

    return `
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <div class="subtitle">Financial overview — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div class="stats-grid">
        ${statCard('Total Revenue', s.revenue, 'This period', 'positive')}
        ${statCard('Total Expenses', s.expenses, 'This period', 'negative')}
        ${statCard('Net Income', s.netIncome, s.netIncome >= 0 ? 'Profit' : 'Loss', s.netIncome >= 0 ? 'positive' : 'negative')}
        ${statCard('Accounts Receivable', s.receivable, s.overdueInvoices + ' overdue invoice(s)')}
        ${statCard('Accounts Payable', s.payable, 'Outstanding bills')}
        ${statCard('Total Assets', s.totalAssets, 'Balance sheet')}
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-header"><h3>Recent Journal Entries</h3></div>
          <div class="card-body table-wrap">${entriesHtml}</div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Recent Invoices</h3></div>
          <div class="card-body table-wrap">${invoicesHtml}</div>
        </div>
      </div>
    `;
  },

  // ---- Journal Entries ----
  journal() {
    const entries = DB.getJournalEntries().reverse();
    let tableHtml = entries.length ? `
      <table class="data-table">
        <thead><tr><th>Date</th><th>Entry ID</th><th>Description</th><th>Lines</th><th class="text-right">Total Debit</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${entries.map(e => {
            const totalDebit = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
            return `<tr>
              <td>${App.fmtDate(e.date)}</td>
              <td>${e.id}</td>
              <td>${e.description}</td>
              <td class="text-center">${e.lines.length}</td>
              <td class="text-right">${App.fmt(totalDebit)}</td>
              <td>${e.status === 'draft' ? '<span class="badge badge-draft">Draft</span>' : '<span class="badge badge-active">Posted</span>'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="JournalActions.view('${e.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="JournalActions.delete('${e.id}')">Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('📝', 'No journal entries', 'Create a double-entry journal entry to record transactions.', 'New Journal Entry', () => JournalActions.openForm());

    return `
      <div class="page-header">
        <div>
          <h2>Journal Entries</h2>
          <div class="subtitle">Record transactions using double-entry bookkeeping</div>
        </div>
        <button class="btn btn-primary" onclick="JournalActions.openForm()">+ New Journal Entry</button>
      </div>
      <div class="card">
        <div class="card-body table-wrap">${tableHtml}</div>
      </div>
    `;
  },

  // ---- General Ledger ----
  ledger() {
    const ledger = Accounting.getGeneralLedger();
    let html = ledger.length ? ledger.map(g => {
      let runningBal = 0;
      return `
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><h3>${g.account.code} — ${g.account.name} <span class="badge badge-active">${g.account.type}</span></h3></div>
          <div class="card-body table-wrap">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Entry ID</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead>
              <tbody>
                ${g.entries.map(e => `<tr>
                  <td>${App.fmtDate(e.date)}</td>
                  <td>${e.ref}</td>
                  <td>${e.description}</td>
                  <td class="text-right">${e.debit ? App.fmt(e.debit) : ''}</td>
                  <td class="text-right">${e.credit ? App.fmt(e.credit) : ''}</td>
                  <td class="text-right">${App.fmt(e.runningBalance)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('') : Components.emptyState('📖', 'No ledger entries', 'Post journal entries to see the general ledger.', 'Go to Journal', () => App.navigate('journal'));

    return `
      <div class="page-header">
        <div>
          <h2>General Ledger</h2>
          <div class="subtitle">Complete transaction history by account</div>
        </div>
      </div>
      ${html}
    `;
  },

  // ---- Chart of Accounts ----
  accounts() {
    const accounts = DB.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    const types = Object.values(AccountTypes);
    const typeClass = (t) => 'type-' + t.toLowerCase();

    let tableHtml = types.map(type => {
      const accs = accounts.filter(a => a.type === type);
      if (!accs.length) return '';
      const total = accs.reduce((s, a) => s + Accounting.getAccountBalance(a.id), 0);
      return `
        <div style="margin-bottom:24px">
          <h3 style="margin-bottom:8px" class="${typeClass(type)}">${type}</h3>
          <table class="data-table">
            <thead><tr><th>Code</th><th>Account Name</th><th>Subtype</th><th class="text-right">Balance</th><th></th></tr></thead>
            <tbody>
              ${accs.map(a => `<tr>
                <td>${a.code}</td>
                <td>${a.name}</td>
                <td>${a.subtype || '—'}</td>
                <td class="text-right">${App.fmt(Accounting.getAccountBalance(a.id))}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="AccountActions.edit('${a.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="AccountActions.delete('${a.id}')">Delete</button>
                </td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr class="total-row"><td colspan="3">Total ${type}</td><td class="text-right">${App.fmt(total)}</td><td></td></tr></tfoot>
          </table>
        </div>
      `;
    }).join('');

    if (!accounts.length) tableHtml = Components.emptyState('🗂️', 'No accounts', 'Add your first account or load the default chart of accounts.');

    return `
      <div class="page-header">
        <div>
          <h2>Chart of Accounts</h2>
          <div class="subtitle">Manage your accounting structure</div>
        </div>
        <button class="btn btn-primary" onclick="AccountActions.openForm()">+ New Account</button>
      </div>
      <div class="card">
        <div class="card-body">${tableHtml}</div>
      </div>
    `;
  },

  // ---- Invoices ----
  invoices() {
    const invoices = DB.getInvoices().reverse();
    let tableHtml = invoices.length ? `
      <table class="data-table">
        <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th class="text-right">Amount</th><th class="text-right">Balance Due</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${invoices.map(i => {
            const contact = DB.getContact(i.contactId);
            const status = Components.getInvoiceStatus(i);
            const balance = i.total - (i.amountPaid || 0);
            return `<tr>
              <td>${i.id}</td>
              <td>${App.fmtDate(i.date)}</td>
              <td>${contact ? contact.name : '—'}</td>
              <td class="text-right">${App.fmt(i.total)}</td>
              <td class="text-right">${App.fmt(balance)}</td>
              <td>${Components.badge(status)}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="InvoiceActions.view('${i.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="InvoiceActions.delete('${i.id}')">Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('📄', 'No invoices', 'Create your first invoice to track sales.', 'New Invoice', () => InvoiceActions.openForm());

    return `
      <div class="page-header">
        <div>
          <h2>Invoices</h2>
          <div class="subtitle">Sales invoices and receivables</div>
        </div>
        <button class="btn btn-primary" onclick="InvoiceActions.openForm()">+ New Invoice</button>
      </div>
      <div class="card">
        <div class="card-body table-wrap">${tableHtml}</div>
      </div>
    `;
  },

  // ---- Bills ----
  bills() {
    const bills = DB.getBills().reverse();
    let tableHtml = bills.length ? `
      <table class="data-table">
        <thead><tr><th>Bill #</th><th>Date</th><th>Vendor</th><th>Category</th><th class="text-right">Amount</th><th class="text-right">Balance Due</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${bills.map(b => {
            const contact = DB.getContact(b.contactId);
            const status = Components.getBillStatus(b);
            const balance = b.total - (b.amountPaid || 0);
            return `<tr>
              <td>${b.id}</td>
              <td>${App.fmtDate(b.date)}</td>
              <td>${contact ? contact.name : '—'}</td>
              <td>${b.category || '—'}</td>
              <td class="text-right">${App.fmt(b.total)}</td>
              <td class="text-right">${App.fmt(balance)}</td>
              <td>${Components.badge(status)}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="BillActions.view('${b.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="BillActions.delete('${b.id}')">Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('🧾', 'No bills', 'Record your first bill or expense.', 'New Bill', () => BillActions.openForm());

    return `
      <div class="page-header">
        <div>
          <h2>Bills & Expenses</h2>
          <div class="subtitle">Track purchases and accounts payable</div>
        </div>
        <button class="btn btn-primary" onclick="BillActions.openForm()">+ New Bill</button>
      </div>
      <div class="card">
        <div class="card-body table-wrap">${tableHtml}</div>
      </div>
    `;
  },

  // ---- Contacts ----
  contacts() {
    const contacts = DB.getContacts();
    let tableHtml = contacts.length ? `
      <table class="data-table">
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th class="text-right">Balance</th><th></th></tr></thead>
        <tbody>
          ${contacts.map(c => {
            let balance = 0;
            if (c.type === 'Customer') {
              balance = DB.getInvoices().filter(i => i.contactId === c.id).reduce((s, i) => s + (i.total - (i.amountPaid || 0)), 0);
            } else {
              balance = DB.getBills().filter(b => b.contactId === c.id).reduce((s, b) => s + (b.total - (b.amountPaid || 0)), 0);
            }
            return `<tr>
              <td>${c.id}</td>
              <td>${c.name}</td>
              <td>${c.type === 'Customer' ? '<span class="badge badge-active">Customer</span>' : '<span class="badge badge-draft">Vendor</span>'}</td>
              <td>${c.email || '—'}</td>
              <td>${c.phone || '—'}</td>
              <td class="text-right">${App.fmt(balance)}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="ContactActions.edit('${c.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="ContactActions.delete('${c.id}')">Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : Components.emptyState('👥', 'No contacts', 'Add your first customer or vendor.', 'New Contact', () => ContactActions.openForm());

    return `
      <div class="page-header">
        <div>
          <h2>Contacts</h2>
          <div class="subtitle">Customers and vendors</div>
        </div>
        <button class="btn btn-primary" onclick="ContactActions.openForm()">+ New Contact</button>
      </div>
      <div class="card">
        <div class="card-body table-wrap">${tableHtml}</div>
      </div>
    `;
  },

  // ---- Trial Balance ----
  trialBalance() {
    const tb = Accounting.getTrialBalance();
    let tableHtml = tb.rows.length ? `
      <table class="report-table">
        <thead><tr><th>Code</th><th>Account Name</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead>
        <tbody>
          ${tb.rows.map(r => `<tr>
            <td>${r.code}</td>
            <td>${r.name}</td>
            <td class="text-right">${r.debit ? App.fmt(r.debit) : ''}</td>
            <td class="text-right">${r.credit ? App.fmt(r.credit) : ''}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr class="grand-total">
            <td colspan="2">Total</td>
            <td class="text-right">${App.fmt(tb.totalDebit)}</td>
            <td class="text-right">${App.fmt(tb.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:16px; text-align:center">
        ${Math.abs(tb.totalDebit - tb.totalCredit) < 0.01
          ? '<span class="badge badge-active" style="font-size:14px">✓ Trial Balance is balanced</span>'
          : '<span class="badge badge-overdue" style="font-size:14px">✗ Trial Balance is NOT balanced</span>'}
      </div>
    ` : Components.emptyState('⚖️', 'No data', 'Post journal entries to see the trial balance.');

    return `
      <div class="page-header">
        <div>
          <h2>Trial Balance</h2>
          <div class="subtitle">All account balances — debits must equal credits</div>
        </div>
        <button class="btn btn-secondary" onclick="window.print()">Print</button>
      </div>
      <div class="card">
        <div class="card-body">${tableHtml}</div>
      </div>
    `;
  },

  // ---- Income Statement ----
  incomeStatement() {
    const is = Accounting.getIncomeStatement();
    const settings = DB.getSettings();

    const renderSection = (items, label) => {
      if (!items.length) return '';
      const total = items.reduce((s, a) => s + a.balance, 0);
      return `
        <tr class="section-header"><td colspan="2">${label}</td></tr>
        ${items.map(a => `<tr><td style="padding-left:32px">${a.code} — ${a.name}</td><td class="text-right">${App.fmt(a.balance)}</td></tr>`).join('')}
        <tr class="total-row"><td>Total ${label}</td><td class="text-right">${App.fmt(total)}</td></tr>
      `;
    };

    return `
      <div class="page-header">
        <div>
          <h2>Income Statement</h2>
          <div class="subtitle">Profit & Loss — ${settings.companyName}</div>
        </div>
        <button class="btn btn-secondary" onclick="window.print()">Print</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="report-table">
            <tbody>
              ${renderSection(is.revenue, 'Revenue')}
              ${renderSection(is.expenses, 'Expenses')}
              <tr class="grand-total">
                <td>Net Income</td>
                <td class="text-right ${is.netIncome >= 0 ? 'positive' : 'negative'}">${App.fmt(is.netIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ---- Balance Sheet ----
  balanceSheet() {
    const bs = Accounting.getBalanceSheet();
    const settings = DB.getSettings();

    const renderSection = (items, label) => {
      if (!items.length) return '';
      const total = items.reduce((s, a) => s + a.balance, 0);
      return `
        <tr class="section-header"><td colspan="2">${label}</td></tr>
        ${items.map(a => `<tr><td style="padding-left:32px">${a.code} — ${a.name}</td><td class="text-right">${App.fmt(a.balance)}</td></tr>`).join('')}
        <tr class="total-row"><td>Total ${label}</td><td class="text-right">${App.fmt(total)}</td></tr>
      `;
    };

    return `
      <div class="page-header">
        <div>
          <h2>Balance Sheet</h2>
          <div class="subtitle">${settings.companyName} — ${App.fmtDate(new Date().toISOString())}</div>
        </div>
        <button class="btn btn-secondary" onclick="window.print()">Print</button>
      </div>
      <div class="card">
        <div class="card-body">
          <table class="report-table">
            <tbody>
              ${renderSection(bs.assets, 'Assets')}
              ${renderSection(bs.liabilities, 'Liabilities')}
              ${renderSection(bs.equity, 'Equity')}
              <tr class="grand-total">
                <td>Total Liabilities & Equity</td>
                <td class="text-right">${App.fmt(bs.totalLiabilities + bs.totalEquity)}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:16px; text-align:center">
            ${bs.isBalanced
              ? '<span class="badge badge-active" style="font-size:14px">✓ Balance Sheet is balanced</span>'
              : '<span class="badge badge-overdue" style="font-size:14px">⚠ Balance Sheet does not balance — check your entries</span>'}
          </div>
        </div>
      </div>
    `;
  },

  // ---- Settings ----
  settings() {
    const s = DB.getSettings();
    return `
      <div class="page-header">
        <div>
          <h2>Settings</h2>
          <div class="subtitle">Company and system configuration</div>
        </div>
      </div>
      <div class="card" style="max-width:600px">
        <div class="card-body">
          <div class="form-group">
            <label>Company Name</label>
            <input type="text" id="set-company" value="${s.companyName}">
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="set-currency">
              ${['USD','EUR','GBP','AED','OMR','SAR','INR'].map(c => `<option value="${c}" ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Fiscal Year Start (MM-DD)</label>
            <input type="text" id="set-fiscal" value="${s.fiscalYearStart}" placeholder="01-01">
          </div>
          <button class="btn btn-primary" onclick="SettingsActions.save()">Save Settings</button>
        </div>
      </div>
      <div class="card" style="max-width:600px; margin-top:20px">
        <div class="card-header"><h3>Data Management</h3></div>
        <div class="card-body">
          <p style="color:var(--text-muted); margin-bottom:12px">All data is stored locally in your browser. Resetting will permanently delete all transactions, contacts, and accounts.</p>
          <button class="btn btn-danger" onclick="SettingsActions.reset()">Reset All Data</button>
        </div>
      </div>
    `;
  },
};

// ============ ACTIONS ============
const JournalActions = {
  openForm(entry) {
    const accounts = DB.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    const today = new Date().toISOString().slice(0, 10);
    const editing = entry || { date: today, description: '', status: 'posted', lines: [{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }] };

    const accountOptions = (selected) => accounts.map(a => `<option value="${a.id}" ${selected === a.id ? 'selected' : ''}>${a.code} — ${a.name}</option>`).join('');

    const bodyHtml = `
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="je-date" value="${editing.date}">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="je-description" value="${editing.description || ''}" placeholder="e.g., Monthly rent payment">
      </div>
      <div class="form-group">
        <label>Lines <span class="hint">(at least 2 — debits must equal credits)</span></label>
        <div class="journal-lines" id="je-lines">
          ${editing.lines.map((l, i) => `
            <div class="journal-line" data-index="${i}">
              <select class="je-account">${accountOptions(l.accountId)}</select>
              <input type="number" class="je-debit" placeholder="Debit" value="${l.debit || ''}" step="0.01" min="0">
              <input type="number" class="je-credit" placeholder="Credit" value="${l.credit || ''}" step="0.01" min="0">
              <span></span>
              <button class="remove-line" onclick="JournalActions.removeLine(this)">&times;</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="JournalActions.addLine()" style="margin-top:8px">+ Add Line</button>
        <div class="journal-totals">
          <div class="journal-total"><div class="label">Total Debit</div><div class="value" id="je-total-debit">${this.fmt(0)}</div></div>
          <div class="journal-total"><div class="label">Total Credit</div><div class="value" id="je-total-credit">${this.fmt(0)}</div></div>
          <div class="journal-total"><div class="label">Difference</div><div class="value" id="je-diff">${this.fmt(0)}</div></div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="JournalActions.save()">Save Entry</button>
    `;

    Components.openModal('New Journal Entry', bodyHtml, { footer, size: 'lg' });
    this.updateTotals();
    // Bind input listeners
    setTimeout(() => {
      document.querySelectorAll('#je-lines input, #je-lines select').forEach(el => {
        el.addEventListener('input', () => JournalActions.updateTotals());
      });
    }, 0);
  },

  addLine() {
    const container = document.getElementById('je-lines');
    const accounts = DB.getAccounts().sort((a, b) => a.code.localeCompare(b.code));
    const accountOptions = accounts.map(a => `<option value="${a.id}">${a.code} — ${a.name}</option>`).join('');
    const div = document.createElement('div');
    div.className = 'journal-line';
    div.innerHTML = `
      <select class="je-account"><option value="">Select account...</option>${accountOptions}</select>
      <input type="number" class="je-debit" placeholder="Debit" step="0.01" min="0">
      <input type="number" class="je-credit" placeholder="Credit" step="0.01" min="0">
      <span></span>
      <button class="remove-line" onclick="JournalActions.removeLine(this)">&times;</button>
    `;
    container.appendChild(div);
    div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', () => JournalActions.updateTotals()));
    this.updateTotals();
  },

  removeLine(btn) {
    const lines = document.querySelectorAll('.journal-line');
    if (lines.length <= 2) { Components.toast('Need at least 2 lines', 'error'); return; }
    btn.closest('.journal-line').remove();
    this.updateTotals();
  },

  updateTotals() {
    let totalDebit = 0, totalCredit = 0;
    document.querySelectorAll('.journal-line').forEach(line => {
      const d = parseFloat(line.querySelector('.je-debit').value) || 0;
      const c = parseFloat(line.querySelector('.je-credit').value) || 0;
      totalDebit += d;
      totalCredit += c;
    });
    const diff = totalDebit - totalCredit;
    const balanced = Math.abs(diff) < 0.01;
    document.getElementById('je-total-debit').textContent = Accounting.formatMoney(totalDebit);
    document.getElementById('je-total-credit').textContent = Accounting.formatMoney(totalCredit);
    const diffEl = document.getElementById('je-diff');
    diffEl.textContent = Accounting.formatMoney(Math.abs(diff));
    diffEl.className = 'value ' + (balanced ? 'journal-balanced' : 'journal-unbalanced');
  },

  save() {
    const date = document.getElementById('je-date').value;
    const description = document.getElementById('je-description').value.trim();
    if (!date || !description) { Components.toast('Date and description are required', 'error'); return; }

    const lines = [];
    let totalDebit = 0, totalCredit = 0;
    document.querySelectorAll('.journal-line').forEach(line => {
      const accountId = line.querySelector('.je-account').value;
      const debit = parseFloat(line.querySelector('.je-debit').value) || 0;
      const credit = parseFloat(line.querySelector('.je-credit').value) || 0;
      if (accountId && (debit > 0 || credit > 0)) {
        lines.push({ accountId, debit, credit });
        totalDebit += debit;
        totalCredit += credit;
      }
    });

    if (lines.length < 2) { Components.toast('Need at least 2 valid lines', 'error'); return; }
    if (Math.abs(totalDebit - totalCredit) >= 0.01) { Components.toast('Debits must equal credits', 'error'); return; }

    DB.addJournalEntry({ date, description, status: 'posted', lines });
    Components.closeModal();
    Components.toast('Journal entry saved');
    App.render();
  },

  view(id) {
    const entry = DB.getJournalEntry(id);
    if (!entry) return;
    const bodyHtml = `
      <div class="form-group"><label>Date</label><div>${App.fmtDate(entry.date)}</div></div>
      <div class="form-group"><label>Description</label><div>${entry.description}</div></div>
      <table class="data-table">
        <thead><tr><th>Account</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead>
        <tbody>
          ${entry.lines.map(l => {
            const acc = DB.getAccount(l.accountId);
            return `<tr>
              <td>${acc ? acc.code + ' — ' + acc.name : l.accountId}</td>
              <td class="text-right">${l.debit ? App.fmt(l.debit) : ''}</td>
              <td class="text-right">${l.credit ? App.fmt(l.credit) : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr class="total-row"><td>Total</td><td class="text-right">${App.fmt(entry.lines.reduce((s,l)=>s+(l.debit||0),0))}</td><td class="text-right">${App.fmt(entry.lines.reduce((s,l)=>s+(l.credit||0),0))}</td></tr></tfoot>
      </table>
    `;
    Components.openModal(`Journal Entry ${entry.id}`, bodyHtml);
  },

  delete(id) {
    if (!Components.confirm('Delete this journal entry?')) return;
    DB.deleteJournalEntry(id);
    Components.toast('Journal entry deleted');
    App.render();
  },

  fmt(amount) { return Accounting.formatMoney(amount); }
};

const AccountActions = {
  openForm(existing) {
    const acc = existing || { code: '', name: '', type: 'Asset', subtype: '' };
    const bodyHtml = `
      <div class="form-row">
        <div class="form-group"><label>Account Code</label><input type="text" id="acc-code" value="${acc.code}" placeholder="e.g. 1100"></div>
        <div class="form-group"><label>Account Type</label>
          <select id="acc-type">${Object.values(AccountTypes).map(t => `<option ${acc.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Account Name</label><input type="text" id="acc-name" value="${acc.name}" placeholder="e.g. Petty Cash"></div>
      <div class="form-group"><label>Subtype <span class="hint">(optional)</span></label><input type="text" id="acc-subtype" value="${acc.subtype || ''}" placeholder="e.g. Current Asset"></div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="AccountActions.save(${existing ? `'${existing.id}'` : ''})">Save</button>
    `;
    Components.openModal(existing ? 'Edit Account' : 'New Account', bodyHtml, { footer });
  },

  edit(id) {
    const acc = DB.getAccount(id);
    this.openForm(acc);
  },

  save(id) {
    const code = document.getElementById('acc-code').value.trim();
    const name = document.getElementById('acc-name').value.trim();
    const type = document.getElementById('acc-type').value;
    const subtype = document.getElementById('acc-subtype').value.trim();
    if (!code || !name) { Components.toast('Code and name are required', 'error'); return; }
    if (id) {
      DB.updateAccount(id, { code, name, type, subtype });
    } else {
      const existing = DB.getAccount(code);
      if (existing) { Components.toast('Account code already exists', 'error'); return; }
      DB.addAccount({ code, name, type, subtype });
    }
    Components.closeModal();
    Components.toast('Account saved');
    App.render();
  },

  delete(id) {
    if (!Components.confirm('Delete this account?')) return;
    const result = DB.deleteAccount(id);
    if (result.error) { Components.toast(result.error, 'error'); return; }
    Components.toast('Account deleted');
    App.render();
  },
};

const ContactActions = {
  openForm(existing) {
    const c = existing || { name: '', type: 'Customer', email: '', phone: '', address: '' };
    const bodyHtml = `
      <div class="form-row">
        <div class="form-group"><label>Name</label><input type="text" id="ct-name" value="${c.name}" placeholder="Company or person name"></div>
        <div class="form-group"><label>Type</label>
          <select id="ct-type">
            <option value="Customer" ${c.type === 'Customer' ? 'selected' : ''}>Customer</option>
            <option value="Vendor" ${c.type === 'Vendor' ? 'selected' : ''}>Vendor</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="ct-email" value="${c.email || ''}" placeholder="contact@example.com"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="ct-phone" value="${c.phone || ''}" placeholder="+1..."></div>
      </div>
      <div class="form-group"><label>Address</label><textarea id="ct-address" rows="2">${c.address || ''}</textarea></div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="ContactActions.save(${existing ? `'${existing.id}'` : ''})">Save</button>
    `;
    Components.openModal(existing ? 'Edit Contact' : 'New Contact', bodyHtml, { footer });
  },

  edit(id) { this.openForm(DB.getContact(id)); },

  save(id) {
    const name = document.getElementById('ct-name').value.trim();
    if (!name) { Components.toast('Name is required', 'error'); return; }
    const data = {
      name,
      type: document.getElementById('ct-type').value,
      email: document.getElementById('ct-email').value.trim(),
      phone: document.getElementById('ct-phone').value.trim(),
      address: document.getElementById('ct-address').value.trim()
    };
    if (id) DB.updateContact(id, data);
    else DB.addContact(data);
    Components.closeModal();
    Components.toast('Contact saved');
    App.render();
  },

  delete(id) {
    if (!Components.confirm('Delete this contact?')) return;
    DB.deleteContact(id);
    Components.toast('Contact deleted');
    App.render();
  },
};

const InvoiceActions = {
  openForm(existing) {
    const customers = DB.getContacts('Customer');
    if (!customers.length) { Components.toast('Add a customer first', 'error'); App.navigate('contacts'); return; }
    const inv = existing || {
      contactId: '', date: new Date().toISOString().slice(0, 10),
      dueDate: '', items: [{ description: '', quantity: 1, price: 0 }],
      taxRate: 0, notes: '', amountPaid: 0, status: 'sent'
    };
    const customerOptions = customers.map(c => `<option value="${c.id}" ${inv.contactId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const bodyHtml = `
      <div class="form-row">
        <div class="form-group"><label>Customer</label><select id="inv-customer">${customerOptions}</select></div>
        <div class="form-group"><label>Invoice Date</label><input type="date" id="inv-date" value="${inv.date}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Due Date</label><input type="date" id="inv-due" value="${inv.dueDate || ''}"></div>
        <div class="form-group"><label>Tax Rate (%)</label><input type="number" id="inv-tax" value="${inv.taxRate || 0}" step="0.01" min="0"></div>
      </div>
      <div class="form-group">
        <label>Line Items</label>
        <div id="inv-items">
          ${inv.items.map((item, i) => `
            <div class="journal-line" data-index="${i}">
              <input type="text" class="item-desc" placeholder="Description" value="${item.description || ''}">
              <input type="number" class="item-qty" placeholder="Qty" value="${item.quantity || 1}" step="1" min="1">
              <input type="number" class="item-price" placeholder="Price" value="${item.price || 0}" step="0.01" min="0">
              <span class="item-total">${App.fmt((item.quantity || 0) * (item.price || 0))}</span>
              <button class="remove-line" onclick="InvoiceActions.removeItem(this)">&times;</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="InvoiceActions.addItem()" style="margin-top:8px">+ Add Item</button>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="inv-notes" rows="2">${inv.notes || ''}</textarea></div>
      <div id="inv-totals" style="text-align:right; margin-top:12px;"></div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="InvoiceActions.save(${existing ? `'${existing.id}'` : ''})">Save Invoice</button>
    `;
    Components.openModal(existing ? 'Edit Invoice' : 'New Invoice', bodyHtml, { footer, size: 'lg' });
    this.updateTotals();
    setTimeout(() => {
      document.querySelectorAll('#inv-items input').forEach(el => el.addEventListener('input', () => InvoiceActions.updateTotals()));
    }, 0);
  },

  addItem() {
    const div = document.createElement('div');
    div.className = 'journal-line';
    div.innerHTML = `
      <input type="text" class="item-desc" placeholder="Description">
      <input type="number" class="item-qty" placeholder="Qty" value="1" step="1" min="1">
      <input type="number" class="item-price" placeholder="Price" value="0" step="0.01" min="0">
      <span class="item-total">${App.fmt(0)}</span>
      <button class="remove-line" onclick="InvoiceActions.removeItem(this)">&times;</button>
    `;
    document.getElementById('inv-items').appendChild(div);
    div.querySelectorAll('input').forEach(el => el.addEventListener('input', () => InvoiceActions.updateTotals()));
  },

  removeItem(btn) {
    const items = document.querySelectorAll('#inv-items .journal-line');
    if (items.length <= 1) { Components.toast('Need at least 1 item', 'error'); return; }
    btn.closest('.journal-line').remove();
    this.updateTotals();
  },

  updateTotals() {
    let subtotal = 0;
    document.querySelectorAll('#inv-items .journal-line').forEach(line => {
      const qty = parseFloat(line.querySelector('.item-qty').value) || 0;
      const price = parseFloat(line.querySelector('.item-price').value) || 0;
      const total = qty * price;
      line.querySelector('.item-total').textContent = App.fmt(total);
      subtotal += total;
    });
    const taxRate = parseFloat(document.getElementById('inv-tax').value) || 0;
    const tax = subtotal * taxRate / 100;
    const grandTotal = subtotal + tax;
    document.getElementById('inv-totals').innerHTML = `
      <div style="margin-bottom:4px">Subtotal: <strong>${App.fmt(subtotal)}</strong></div>
      <div style="margin-bottom:4px">Tax (${taxRate}%): <strong>${App.fmt(tax)}</strong></div>
      <div style="font-size:18px; margin-top:8px">Total: <strong>${App.fmt(grandTotal)}</strong></div>
    `;
  },

  save(id) {
    const contactId = document.getElementById('inv-customer').value;
    const date = document.getElementById('inv-date').value;
    const dueDate = document.getElementById('inv-due').value;
    const taxRate = parseFloat(document.getElementById('inv-tax').value) || 0;
    const notes = document.getElementById('inv-notes').value.trim();
    if (!contactId || !date) { Components.toast('Customer and date are required', 'error'); return; }

    const items = [];
    document.querySelectorAll('#inv-items .journal-line').forEach(line => {
      const description = line.querySelector('.item-desc').value.trim();
      const quantity = parseFloat(line.querySelector('.item-qty').value) || 0;
      const price = parseFloat(line.querySelector('.item-price').value) || 0;
      if (description) items.push({ description, quantity, price });
    });
    if (!items.length) { Components.toast('Add at least 1 item', 'error'); return; }

    const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const tax = subtotal * taxRate / 100;
    const total = subtotal + tax;

    const data = { contactId, date, dueDate, items, taxRate, tax, subtotal, total, notes, amountPaid: 0, status: 'sent' };
    if (id) DB.updateInvoice(id, data);
    else DB.addInvoice(data);

    // Auto-create journal entry
    const arAccount = DB.getAccounts().find(a => a.name === 'Accounts Receivable');
    const revAccount = DB.getAccounts().find(a => a.name === 'Sales Revenue' || a.name === 'Service Revenue');
    const taxAccount = DB.getAccounts().find(a => a.name === 'Sales Tax Payable');

    if (arAccount && revAccount) {
      const lines = [
        { accountId: arAccount.id, debit: total, credit: 0 },
        { accountId: revAccount.id, debit: 0, credit: subtotal }
      ];
      if (tax > 0 && taxAccount) {
        lines.push({ accountId: taxAccount.id, debit: 0, credit: tax });
      }
      DB.addJournalEntry({
        date, description: `Invoice ${id || '(new)'} — ${DB.getContact(contactId).name}`,
        status: 'posted', lines
      });
    }

    Components.closeModal();
    Components.toast('Invoice saved');
    App.render();
  },

  view(id) {
    const inv = DB.getInvoice(id);
    if (!inv) return;
    const contact = DB.getContact(inv.contactId);
    const settings = DB.getSettings();
    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; margin-bottom:20px">
        <div>
          <h3 style="font-size:22px">${settings.companyName}</h3>
          <div style="color:var(--text-muted)">Invoice ${inv.id}</div>
        </div>
        <div style="text-align:right">
          <div><strong>Bill To:</strong> ${contact ? contact.name : '—'}</div>
          ${contact && contact.email ? `<div style="color:var(--text-muted)">${contact.email}</div>` : ''}
        </div>
      </div>
      <div class="form-row" style="margin-bottom:16px">
        <div><strong>Date:</strong> ${App.fmtDate(inv.date)}</div>
        <div><strong>Due:</strong> ${App.fmtDate(inv.dueDate)}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          ${inv.items.map(i => `<tr>
            <td>${i.description}</td>
            <td class="text-right">${i.quantity}</td>
            <td class="text-right">${App.fmt(i.price)}</td>
            <td class="text-right">${App.fmt(i.quantity * i.price)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right; margin-top:16px">
        <div>Subtotal: ${App.fmt(inv.subtotal)}</div>
        <div>Tax (${inv.taxRate || 0}%): ${App.fmt(inv.tax || 0)}</div>
        <div style="font-size:18px; margin-top:8px"><strong>Total: ${App.fmt(inv.total)}</strong></div>
        ${inv.amountPaid ? `<div style="margin-top:4px; color:var(--green)">Paid: ${App.fmt(inv.amountPaid)}</div>` : ''}
        ${inv.total - (inv.amountPaid || 0) > 0 ? `<div style="margin-top:4px">Balance Due: ${App.fmt(inv.total - (inv.amountPaid || 0))}</div>` : ''}
      </div>
      ${inv.notes ? `<div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border); color:var(--text-muted)"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
    `;
    Components.openModal(`Invoice ${inv.id}`, bodyHtml, { size: 'lg' });
  },

  delete(id) {
    if (!Components.confirm('Delete this invoice?')) return;
    DB.deleteInvoice(id);
    Components.toast('Invoice deleted');
    App.render();
  },
};

const BillActions = {
  openForm(existing) {
    const vendors = DB.getContacts('Vendor');
    if (!vendors.length) { Components.toast('Add a vendor first', 'error'); App.navigate('contacts'); return; }
    const expenseAccounts = DB.getAccounts().filter(a => a.type === 'Expense');
    const bill = existing || {
      contactId: '', date: new Date().toISOString().slice(0, 10),
      dueDate: '', category: '', amount: 0, taxAmount: 0, notes: '', amountPaid: 0, status: 'unpaid'
    };
    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${bill.contactId === v.id ? 'selected' : ''}>${v.name}</option>`).join('');
    const bodyHtml = `
      <div class="form-row">
        <div class="form-group"><label>Vendor</label><select id="bill-vendor">${vendorOptions}</select></div>
        <div class="form-group"><label>Bill Date</label><input type="date" id="bill-date" value="${bill.date}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Due Date</label><input type="date" id="bill-due" value="${bill.dueDate || ''}"></div>
        <div class="form-group"><label>Expense Category</label>
          <select id="bill-category">
            ${expenseAccounts.map(a => `<option value="${a.id}" ${bill.category === a.id ? 'selected' : ''}>${a.code} — ${a.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Amount</label><input type="number" id="bill-amount" value="${bill.amount || 0}" step="0.01" min="0"></div>
        <div class="form-group"><label>Tax Amount</label><input type="number" id="bill-tax" value="${bill.taxAmount || 0}" step="0.01" min="0"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="bill-notes" rows="2">${bill.notes || ''}</textarea></div>
      <div id="bill-total" style="text-align:right; margin-top:12px;"></div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="BillActions.save(${existing ? `'${existing.id}'` : ''})">Save Bill</button>
    `;
    Components.openModal(existing ? 'Edit Bill' : 'New Bill', bodyHtml, { footer });
    this.updateTotal();
    setTimeout(() => {
      document.getElementById('bill-amount').addEventListener('input', () => BillActions.updateTotal());
      document.getElementById('bill-tax').addEventListener('input', () => BillActions.updateTotal());
    }, 0);
  },

  updateTotal() {
    const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
    const tax = parseFloat(document.getElementById('bill-tax').value) || 0;
    document.getElementById('bill-total').innerHTML = `<div style="font-size:18px">Total: <strong>${App.fmt(amount + tax)}</strong></div>`;
  },

  save(id) {
    const contactId = document.getElementById('bill-vendor').value;
    const date = document.getElementById('bill-date').value;
    const dueDate = document.getElementById('bill-due').value;
    const categoryId = document.getElementById('bill-category').value;
    const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
    const taxAmount = parseFloat(document.getElementById('bill-tax').value) || 0;
    const notes = document.getElementById('bill-notes').value.trim();
    const categoryAccount = DB.getAccount(categoryId);

    if (!contactId || !date || amount <= 0) { Components.toast('Vendor, date, and amount are required', 'error'); return; }

    const total = amount + taxAmount;
    const data = {
      contactId, date, dueDate, category: categoryAccount ? categoryAccount.name : '',
      categoryId, amount, taxAmount, total, notes, amountPaid: 0, status: 'unpaid'
    };
    if (id) DB.updateBill(id, data);
    else DB.addBill(data);

    // Auto-create journal entry: debit expense, credit accounts payable
    const apAccount = DB.getAccounts().find(a => a.name === 'Accounts Payable');
    if (categoryId && apAccount) {
      const lines = [
        { accountId: categoryId, debit: amount, credit: 0 },
        { accountId: apAccount.id, debit: 0, credit: total }
      ];
      if (taxAmount > 0) {
        const taxAccount = DB.getAccounts().find(a => a.name === 'Sales Tax Payable');
        if (taxAccount) {
          lines[0].debit = total;
          lines.push({ accountId: taxAccount.id, debit: 0, credit: taxAmount });
          lines[1].credit = amount;
        }
      }
      DB.addJournalEntry({
        date, description: `Bill — ${DB.getContact(contactId).name} (${categoryAccount ? categoryAccount.name : 'Expense'})`,
        status: 'posted', lines
      });
    }

    Components.closeModal();
    Components.toast('Bill saved');
    App.render();
  },

  view(id) {
    const bill = DB.getBill(id);
    if (!bill) return;
    const contact = DB.getContact(bill.contactId);
    const bodyHtml = `
      <div class="form-row">
        <div class="form-group"><label>Vendor</label><div>${contact ? contact.name : '—'}</div></div>
        <div class="form-group"><label>Date</label><div>${App.fmtDate(bill.date)}</div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Due Date</label><div>${App.fmtDate(bill.dueDate)}</div></div>
        <div class="form-group"><label>Category</label><div>${bill.category || '—'}</div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Amount</label><div>${App.fmt(bill.amount)}</div></div>
        <div class="form-group"><label>Tax</label><div>${App.fmt(bill.taxAmount || 0)}</div></div>
      </div>
      <div style="text-align:right; font-size:18px; margin-top:12px"><strong>Total: ${App.fmt(bill.total)}</strong></div>
      ${bill.notes ? `<div style="margin-top:16px; color:var(--text-muted)"><strong>Notes:</strong> ${bill.notes}</div>` : ''}
    `;
    Components.openModal(`Bill ${bill.id}`, bodyHtml);
  },

  delete(id) {
    if (!Components.confirm('Delete this bill?')) return;
    DB.deleteBill(id);
    Components.toast('Bill deleted');
    App.render();
  },
};

const SettingsActions = {
  save() {
    const companyName = document.getElementById('set-company').value.trim();
    const currency = document.getElementById('set-currency').value;
    const fiscalYearStart = document.getElementById('set-fiscal').value.trim();
    if (!companyName) { Components.toast('Company name is required', 'error'); return; }
    DB.updateSettings({ companyName, currency, fiscalYearStart });
    Components.toast('Settings saved');
    App.render();
  },

  reset() {
    if (!Components.confirm('This will permanently delete ALL data (accounts, entries, contacts, invoices, bills). Continue?')) return;
    DB.reset();
    Components.toast('All data has been reset');
    App.render();
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
