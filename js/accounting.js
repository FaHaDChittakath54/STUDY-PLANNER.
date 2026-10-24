/**
 * accounting.js — Core accounting logic
 * Double-entry bookkeeping calculations, trial balance, and financial reports.
 */

const Accounting = {
  /**
   * Get all ledger entries for an account (from journal entries)
   */
  getAccountLedger(accountId) {
    const entries = DB.getJournalEntries();
    const ledger = [];
    entries.forEach(entry => {
      if (entry.status === 'draft') return;
      entry.lines.forEach(line => {
        if (line.accountId === accountId) {
          ledger.push({
            entryId: entry.id,
            date: entry.date,
            description: entry.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            ref: entry.id
          });
        }
      });
    });
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));
    return ledger;
  },

  /**
   * Calculate account balance (debit - credit for debit-normal accounts, credit - debit for credit-normal accounts)
   */
  getAccountBalance(accountId) {
    const account = DB.getAccount(accountId);
    if (!account) return 0;
    const ledger = this.getAccountLedger(accountId);
    let totalDebit = 0, totalCredit = 0;
    ledger.forEach(l => {
      totalDebit += l.debit || 0;
      totalCredit += l.credit || 0;
    });
    // Assets & Expenses are debit-normal; Liabilities, Equity, Revenue are credit-normal
    const isDebitNormal = account.type === 'Asset' || account.type === 'Expense';
    return isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
  },

  /**
   * Get balances grouped by account type
   */
  getBalancesByType() {
    const accounts = DB.getAccounts();
    const groups = {};
    Object.values(AccountTypes).forEach(t => groups[t] = []);
    accounts.forEach(acc => {
      const balance = this.getAccountBalance(acc.id);
      if (balance !== 0 || true) {
        groups[acc.type].push({ ...acc, balance });
      }
    });
    return groups;
  },

  /**
   * Trial Balance — all accounts with non-zero balances, debits must equal credits
   */
  getTrialBalance() {
    const accounts = DB.getAccounts();
    const rows = [];
    let totalDebit = 0, totalCredit = 0;
    accounts.forEach(acc => {
      const ledger = this.getAccountLedger(acc.id);
      let debit = 0, credit = 0;
      ledger.forEach(l => {
        debit += l.debit || 0;
        credit += l.credit || 0;
      });
      const netDebit = debit - credit;
      const isDebitNormal = acc.type === 'Asset' || acc.type === 'Expense';
      const balance = isDebitNormal ? netDebit : -netDebit;
      if (balance !== 0) {
        if (balance > 0) {
          rows.push({ ...acc, debit: balance, credit: 0 });
          totalDebit += balance;
        } else {
          rows.push({ ...acc, debit: 0, credit: -balance });
          totalCredit += -balance;
        }
      }
    });
    return { rows, totalDebit, totalCredit };
  },

  /**
   * Income Statement (Profit & Loss)
   */
  getIncomeStatement() {
    const groups = this.getBalancesByType();
    const revenueAccounts = groups['Revenue'] || [];
    const expenseAccounts = groups['Expense'] || [];

    let totalRevenue = 0;
    revenueAccounts.forEach(a => { totalRevenue += a.balance; });

    let totalExpenses = 0;
    expenseAccounts.forEach(a => { totalExpenses += a.balance; });

    const netIncome = totalRevenue - totalExpenses;

    return {
      revenue: revenueAccounts.sort((a, b) => a.code.localeCompare(b.code)),
      expenses: expenseAccounts.sort((a, b) => a.code.localeCompare(b.code)),
      totalRevenue,
      totalExpenses,
      netIncome
    };
  },

  /**
   * Balance Sheet
   */
  getBalanceSheet() {
    const groups = this.getBalancesByType();
    const assets = (groups['Asset'] || []).sort((a, b) => a.code.localeCompare(b.code));
    const liabilities = (groups['Liability'] || []).sort((a, b) => a.code.localeCompare(b.code));
    const equity = (groups['Equity'] || []).sort((a, b) => a.code.localeCompare(b.code));

    // Add net income to equity (current period earnings)
    const incomeStmt = this.getIncomeStatement();
    const equityWithIncome = [...equity];
    if (incomeStmt.netIncome !== 0) {
      equityWithIncome.push({
        id: 'netincome',
        code: '3999',
        name: 'Current Year Earnings',
        type: 'Equity',
        balance: incomeStmt.netIncome
      });
    }

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equityWithIncome.reduce((s, a) => s + a.balance, 0);

    return {
      assets,
      liabilities,
      equity: equityWithIncome,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    };
  },

  /**
   * General Ledger — all entries for all accounts
   */
  getGeneralLedger() {
    const accounts = DB.getAccounts();
    const result = [];
    accounts.forEach(acc => {
      const ledger = this.getAccountLedger(acc.id);
      if (ledger.length > 0) {
        let runningBalance = 0;
        const isDebitNormal = acc.type === 'Asset' || acc.type === 'Expense';
        ledger.forEach(l => {
          const netDebit = (l.debit || 0) - (l.credit || 0);
          runningBalance += isDebitNormal ? netDebit : -netDebit;
          l.runningBalance = runningBalance;
        });
        result.push({ account: acc, entries: ledger });
      }
    });
    return result;
  },

  /**
   * Dashboard summary metrics
   */
  getDashboardSummary() {
    const incomeStmt = this.getIncomeStatement();
    const balanceSheet = this.getBalanceSheet();
    const invoices = DB.getInvoices();
    const bills = DB.getBills();

    const totalReceivable = invoices
      .filter(i => i.status !== 'paid')
      .reduce((s, i) => s + (i.total - (i.amountPaid || 0)), 0);

    const totalPayable = bills
      .filter(b => b.status !== 'paid')
      .reduce((s, b) => s + (b.total - (b.amountPaid || 0)), 0);

    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid') return false;
      return new Date(i.dueDate) < new Date();
    }).length;

    return {
      cash: balanceSheet.totalAssets,  // simplified
      revenue: incomeStmt.totalRevenue,
      expenses: incomeStmt.totalExpenses,
      netIncome: incomeStmt.netIncome,
      receivable: totalReceivable,
      payable: totalPayable,
      overdueInvoices,
      totalAssets: balanceSheet.totalAssets,
      totalLiabilities: balanceSheet.totalLiabilities,
      totalEquity: balanceSheet.totalEquity
    };
  },

  /**
   * Format currency
   */
  formatMoney(amount, currency) {
    const cur = currency || DB.getSettings().currency || 'USD';
    const symbols = { USD: '$', EUR: '€', GBP: '£', AED: 'AED ', OMR: 'OMR ', SAR: 'SAR ', INR: '₹' };
    const symbol = symbols[cur] || cur + ' ';
    const sign = amount < 0 ? '-' : '';
    return sign + symbol + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
};
