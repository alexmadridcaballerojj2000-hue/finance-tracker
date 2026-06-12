// FinanceTracker — Main Application Controller
const App = (() => {
  let _txFilter    = { type: 'all', search: '', accountId: '' };
  let _budgetMonth = Utils.getCurrentMonth();
  let _editingId   = null;
  let _rptFrom = '', _rptTo = '';

  // ── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    await window.i18n.init();
    _setupLogin();
    Router.register('dashboard',    _renderDashboard);
    Router.register('transactions', _renderTransactions);
    Router.register('accounts',     _renderAccounts);
    Router.register('budgets',      _renderBudgets);
    Router.register('goals',        _renderGoals);
    Router.register('reports',      _renderReports);
    Router.init();
    _setupListeners();
    if (Auth.isLoggedIn()) _updateGreeting();
  }

  function refresh() { Router.resolve(); }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  function _setupLogin() {
    document.getElementById('login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('login-name').value.trim();
      if (!name) return;
      Auth.login(name);
      _updateGreeting();
      Router.navigate('dashboard');
    });
  }
  function _updateGreeting() {
    const u = Auth.getUser();
    if (!u) return;
    const el = document.getElementById('user-greeting');
    if (el) el.textContent = `${window.i18n.t(Utils.getGreeting())}, ${u.name} 👋`;
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  function _renderDashboard() {
    const t = window.i18n.t;
    const month = Utils.getCurrentMonth();
    const s = Transactions.getMonthSummary(month);
    _set('dash-balance',  Utils.formatCurrency(Accounts.getTotalBalance()));
    _set('dash-income',   Utils.formatCurrency(s.income));
    _set('dash-expenses', Utils.formatCurrency(s.expenses));
    _set('dash-net',      Utils.formatCurrency(s.net));

    const recentEl = document.getElementById('recent-list');
    if (recentEl) {
      const recent = Transactions.getAll().slice(0, 5);
      recentEl.innerHTML = recent.length
        ? recent.map(tx => Transactions.renderRow(tx)).join('')
        : `<div class="empty-state"><span class="empty-state__icon">💸</span><p>${t('dashboard_no_transactions')}</p></div>`;
    }

    const alertsEl = document.getElementById('budget-alerts');
    if (alertsEl) {
      const alerts = Budgets.getAlerts(month);
      alertsEl.innerHTML = alerts.length
        ? alerts.map(b => {
            const { pct, over } = Budgets.getStatus(b);
            const cat = Utils.getCategoryInfo(b.categoryKey, 'expense');
            return `<div class="alert-chip ${over?'over':'warn'}">${cat.icon} ${t('cat_'+b.categoryKey)}: ${Math.round(pct)}%</div>`;
          }).join('')
        : `<p class="text-muted" style="font-size:.85rem">Sin alertas este mes ✅</p>`;
    }
    setTimeout(() => Charts.refresh(month), 80);
  }

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────
  function _renderTransactions() {
    Transactions.renderList(_txFilter);
    _fillAccountFilter();
  }
  function _fillAccountFilter() {
    const sel = document.getElementById('tx-account-filter');
    if (!sel) return;
    const saved = sel.value;
    sel.innerHTML = `<option value="">Todas las cuentas</option>` +
      Accounts.getAll().map(a => `<option value="${a.id}" ${a.id===saved?'selected':''}>${a.icon} ${a.name}</option>`).join('');
  }

  // ── ACCOUNTS ─────────────────────────────────────────────────────────────
  function _renderAccounts() { Accounts.renderList(); }

  // ── BUDGETS ──────────────────────────────────────────────────────────────
  function _renderBudgets() {
    const sel = document.getElementById('budget-month-sel');
    if (sel) sel.value = _budgetMonth;
    Budgets.renderList(_budgetMonth);
  }

  // ── GOALS ────────────────────────────────────────────────────────────────
  function _renderGoals() { Goals.renderList(); }

  // ── REPORTS ──────────────────────────────────────────────────────────────
  function _renderReports() {
    const from = document.getElementById('report-from');
    const to   = document.getElementById('report-to');
    const m    = Utils.getCurrentMonth();
    if (from && !from.value) from.value = m + '-01';
    if (to   && !to.value)   to.value   = Utils.getTodayStr();
    _updateReport();
  }
  function _updateReport() {
    _rptFrom = document.getElementById('report-from')?.value || '';
    _rptTo   = document.getElementById('report-to')?.value   || '';
    const txs = Transactions.getAll({ from: _rptFrom, to: _rptTo });
    const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    _set('report-income',   Utils.formatCurrency(inc));
    _set('report-expenses', Utils.formatCurrency(exp));
    _set('report-net',      Utils.formatCurrency(inc - exp));
    _set('report-count',    txs.length);
    const el = document.getElementById('report-tx-list');
    if (el) el.innerHTML = txs.slice(0,30).map(tx=>Transactions.renderRow(tx)).join('');
  }

  // ── MODAL: TRANSACTION ───────────────────────────────────────────────────
  function openTransactionModal(id = null) {
    _editingId = id;
    const t   = window.i18n.t;
    const tx  = id ? DB.getById('transactions', id) : null;
    const accs = Accounts.getAll();
    _set('modal-tx-title', id ? t('form_edit') : t('transactions_add'));

    const opts = accs.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('');
    _fset('tx-account',    opts, true);
    _fset('tx-to-account', opts, true);

    if (tx) {
      document.getElementById('tx-type').value        = tx.type;
      document.getElementById('tx-amount').value      = tx.amount;
      document.getElementById('tx-description').value = tx.description;
      document.getElementById('tx-date').value        = tx.date;
      document.getElementById('tx-account').value     = tx.accountId;
      if (tx.toAccountId) document.getElementById('tx-to-account').value = tx.toAccountId;
    } else {
      document.getElementById('tx-type').value        = 'expense';
      document.getElementById('tx-amount').value      = '';
      document.getElementById('tx-description').value = '';
      document.getElementById('tx-date').value        = Utils.getTodayStr();
    }
    _updateCatOptions();
    _updateTransferRow();
    _openModal('modal-transaction');
  }

  function _updateCatOptions() {
    const type = document.getElementById('tx-type')?.value;
    const sel  = document.getElementById('tx-category');
    if (!sel || !type) return;
    const t    = window.i18n.t;
    const cats = type==='transfer' ? Utils.CATEGORIES.transfer
               : type==='income'   ? Utils.CATEGORIES.income
               : Utils.CATEGORIES.expense;
    sel.innerHTML = cats.map(c=>`<option value="${c.key}">${c.icon} ${t('cat_'+c.key)}</option>`).join('');
    if (_editingId) {
      const tx = DB.getById('transactions', _editingId);
      if (tx) sel.value = tx.categoryKey;
    }
  }
  function _updateTransferRow() {
    const type = document.getElementById('tx-type')?.value;
    const row  = document.getElementById('transfer-to-row');
    const catR = document.getElementById('category-row');
    if (row)  row.style.display  = type==='transfer' ? 'block' : 'none';
    if (catR) catR.style.display = type==='transfer' ? 'none'  : 'block';
  }

  function saveTransaction() {
    const t  = window.i18n.t;
    const type   = _gv('tx-type');
    const amount = parseFloat(_gv('tx-amount'));
    if (!amount || amount <= 0) { Utils.showToast(t('error_positive'),'error'); return; }
    const data = {
      type, amount,
      categoryKey: _gv('tx-category') || 'other_expense',
      description: _gv('tx-description'),
      date:        _gv('tx-date') || Utils.getTodayStr(),
      accountId:   _gv('tx-account'),
      toAccountId: type==='transfer' ? _gv('tx-to-account') : null
    };
    if (_editingId) Transactions.update(_editingId, data);
    else            Transactions.create(data);
    _closeModal('modal-transaction');
    Utils.showToast(t('saved_ok'));
    refresh();
  }

  function editTransaction(id)   { openTransactionModal(id); }
  function deleteTransaction(id) {
    if (!confirm(window.i18n.t('transactions_delete_confirm'))) return;
    Transactions.remove(id);
    Utils.showToast('Transacción eliminada');
    refresh();
  }

  // ── MODAL: ACCOUNT ───────────────────────────────────────────────────────
  function openAccountModal(id = null) {
    _editingId = id;
    const acc = id ? Accounts.getById(id) : null;
    _set('modal-acc-title', id ? window.i18n.t('form_edit') : window.i18n.t('accounts_add'));
    document.getElementById('acc-name').value    = acc?.name            || '';
    document.getElementById('acc-type').value    = acc?.type            || 'bank';
    document.getElementById('acc-initial').value = acc?.initialBalance  || 0;
    document.getElementById('acc-color').value   = acc?.color           || '#6C63FF';
    _openModal('modal-account');
  }
  function saveAccount() {
    const t = window.i18n.t;
    const name = _gv('acc-name');
    if (!name) { Utils.showToast(t('error_required'),'error'); return; }
    const data = { name, type: _gv('acc-type'), initialBalance: parseFloat(_gv('acc-initial'))||0, color: _gv('acc-color') };
    if (_editingId) Accounts.update(_editingId, data);
    else            Accounts.create(data);
    _closeModal('modal-account');
    Utils.showToast(t('saved_ok'));
    refresh();
  }
  function editAccount(id)   { openAccountModal(id); }
  function deleteAccount(id) {
    if (!confirm(window.i18n.t('accounts_delete_confirm'))) return;
    Accounts.remove(id);
    Utils.showToast('Cuenta eliminada');
    refresh();
  }

  // ── MODAL: BUDGET ────────────────────────────────────────────────────────
  function openBudgetModal(id = null) {
    _editingId = id;
    const b = id ? DB.getById('budgets', id) : null;
    _set('modal-bud-title', id ? window.i18n.t('form_edit') : window.i18n.t('budgets_add'));
    const sel = document.getElementById('bud-category');
    if (sel) sel.innerHTML = Utils.CATEGORIES.expense.map(c =>
      `<option value="${c.key}">${c.icon} ${window.i18n.t('cat_'+c.key)}</option>`).join('');
    document.getElementById('bud-category').value  = b?.categoryKey     || 'food';
    document.getElementById('bud-limit').value     = b?.monthlyLimit    || '';
    document.getElementById('bud-threshold').value = b?.alertThreshold  || 80;
    document.getElementById('bud-month').value     = b?.month           || _budgetMonth;
    _openModal('modal-budget');
  }
  function saveBudget() {
    const t = window.i18n.t;
    const limit = parseFloat(_gv('bud-limit'));
    if (!limit || limit <= 0) { Utils.showToast(t('error_positive'),'error'); return; }
    const data = { categoryKey: _gv('bud-category'), monthlyLimit: limit, alertThreshold: parseInt(_gv('bud-threshold'))||80, month: _gv('bud-month')||_budgetMonth };
    if (_editingId) Budgets.update(_editingId, data);
    else            Budgets.create(data);
    _closeModal('modal-budget');
    Utils.showToast(t('saved_ok'));
    refresh();
  }
  function editBudget(id)   { openBudgetModal(id); }
  function deleteBudget(id) { if (!confirm(window.i18n.t('confirm_delete'))) return; Budgets.remove(id); refresh(); }

  // ── MODAL: GOAL ──────────────────────────────────────────────────────────
  function openGoalModal(id = null) {
    _editingId = id;
    const g = id ? Goals.getById(id) : null;
    _set('modal-goal-title', id ? window.i18n.t('form_edit') : window.i18n.t('goals_add'));
    document.getElementById('goal-name').value    = g?.name          || '';
    document.getElementById('goal-target').value  = g?.targetAmount  || '';
    document.getElementById('goal-current').value = g?.currentAmount || 0;
    document.getElementById('goal-deadline').value= g?.deadline      || '';
    document.getElementById('goal-icon').value    = g?.icon          || '🎯';
    document.getElementById('goal-color').value   = g?.color         || '#6C63FF';
    _openModal('modal-goal');
  }
  function saveGoal() {
    const t    = window.i18n.t;
    const name = _gv('goal-name');
    const tgt  = parseFloat(_gv('goal-target'));
    if (!name)       { Utils.showToast(t('error_required'),'error'); return; }
    if (!tgt||tgt<=0){ Utils.showToast(t('error_positive'),'error'); return; }
    const data = { name, targetAmount: tgt, currentAmount: parseFloat(_gv('goal-current'))||0, deadline: _gv('goal-deadline'), icon: _gv('goal-icon')||'🎯', color: _gv('goal-color')||'#6C63FF' };
    if (_editingId) Goals.update(_editingId, data);
    else            Goals.create(data);
    _closeModal('modal-goal');
    Utils.showToast(t('saved_ok'));
    refresh();
  }
  function editGoal(id)   { openGoalModal(id); }
  function deleteGoal(id) { if (!confirm(window.i18n.t('confirm_delete'))) return; Goals.remove(id); refresh(); }
  function addGoalAmount(id) {
    const amt = parseFloat(prompt(window.i18n.t('goals_amount_label'), ''));
    if (!amt || amt <= 0) return;
    Goals.addAmount(id, amt);
    Utils.showToast(window.i18n.t('saved_ok'));
    _renderGoals();
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────
  function exportCSV() { Export.toCSV(Transactions.getAll({ from: _rptFrom, to: _rptTo })); }
  function exportPDF() {
    const txs = Transactions.getAll({ from: _rptFrom, to: _rptTo });
    const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    Export.toPDF(txs, { income: inc, expenses: exp, net: inc-exp }, `${_rptFrom} → ${_rptTo}`);
  }

  // ── MODAL HELPERS ─────────────────────────────────────────────────────────
  function _openModal(id)  { const m=document.getElementById(id); if(m){m.classList.add('open'); document.body.style.overflow='hidden';} }
  function _closeModal(id) { const m=document.getElementById(id); if(m){m.classList.remove('open'); document.body.style.overflow='';} _editingId=null; }
  function _set(id, val)   { const el=document.getElementById(id); if(el) el.textContent=val; }
  function _gv(id)         { return document.getElementById(id)?.value || ''; }
  function _fset(id, html, isHTML=false) { const el=document.getElementById(id); if(el){ if(isHTML) el.innerHTML=html; else el.value=html; } }

  // ── GLOBAL LISTENERS ─────────────────────────────────────────────────────
  function _setupListeners() {
    // Nav
    document.querySelectorAll('.nav-item').forEach(el =>
      el.addEventListener('click', () => { Router.navigate(el.dataset.route); document.getElementById('sidebar')?.classList.remove('open'); })
    );
    // Mobile menu
    document.getElementById('menu-toggle')?.addEventListener('click', () =>
      document.getElementById('sidebar')?.classList.toggle('open')
    );
    // Language
    document.querySelectorAll('.lang-btn').forEach(btn =>
      btn.addEventListener('click', () => window.i18n.setLanguage(btn.dataset.lang))
    );
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', Auth.logout);

    // Transaction modal
    document.getElementById('btn-add-tx')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('btn-save-tx')?.addEventListener('click', saveTransaction);
    document.getElementById('btn-cancel-tx')?.addEventListener('click', () => _closeModal('modal-transaction'));
    document.getElementById('tx-type')?.addEventListener('change', () => { _updateCatOptions(); _updateTransferRow(); });

    // Tx filters
    document.getElementById('tx-search')?.addEventListener('input', e => { _txFilter.search=e.target.value; Transactions.renderList(_txFilter); });
    document.querySelectorAll('.tx-filter-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.tx-filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      _txFilter.type = btn.dataset.filter;
      Transactions.renderList(_txFilter);
    }));
    document.getElementById('tx-account-filter')?.addEventListener('change', e => { _txFilter.accountId=e.target.value; Transactions.renderList(_txFilter); });

    // Account modal
    document.getElementById('btn-add-account')?.addEventListener('click', () => openAccountModal());
    document.getElementById('btn-save-account')?.addEventListener('click', saveAccount);
    document.getElementById('btn-cancel-account')?.addEventListener('click', () => _closeModal('modal-account'));

    // Budget modal
    document.getElementById('btn-add-budget')?.addEventListener('click', () => openBudgetModal());
    document.getElementById('btn-save-budget')?.addEventListener('click', saveBudget);
    document.getElementById('btn-cancel-budget')?.addEventListener('click', () => _closeModal('modal-budget'));
    document.getElementById('budget-month-sel')?.addEventListener('change', e => { _budgetMonth=e.target.value; Budgets.renderList(_budgetMonth); });

    // Goal modal
    document.getElementById('btn-add-goal')?.addEventListener('click', () => openGoalModal());
    document.getElementById('btn-save-goal')?.addEventListener('click', saveGoal);
    document.getElementById('btn-cancel-goal')?.addEventListener('click', () => _closeModal('modal-goal'));

    // Reports
    document.getElementById('report-from')?.addEventListener('change', _updateReport);
    document.getElementById('report-to')?.addEventListener('change', _updateReport);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
    document.getElementById('btn-export-pdf')?.addEventListener('click', exportPDF);

    // Close modal on backdrop
    document.querySelectorAll('.modal-overlay').forEach(ov =>
      ov.addEventListener('click', e => { if(e.target===ov) _closeModal(ov.id); })
    );
  }

  return {
    init, refresh,
    editTransaction, deleteTransaction,
    editAccount, deleteAccount,
    editBudget, deleteBudget,
    editGoal, deleteGoal, addGoalAmount
  };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
