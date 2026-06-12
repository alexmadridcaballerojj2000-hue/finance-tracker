// FinanceTracker — Auth, Accounts, Transactions, Budgets, Goals

// ─── AUTH ──────────────────────────────────────────────────────────────────
const Auth = (() => {
  function login(name) {
    const user = { name: name.trim(), createdAt: Date.now() };
    DB.saveUser(user);
    DB.seedDemoData();
    return user;
  }
  function logout() { DB.clearUser(); window.location.reload(); }
  function getUser() { return DB.getUser(); }
  function isLoggedIn() { return !!DB.getUser(); }
  return { login, logout, getUser, isLoggedIn };
})();
window.Auth = Auth;

// ─── ACCOUNTS ──────────────────────────────────────────────────────────────
const Accounts = (() => {
  function getAll() { return DB.get('accounts'); }
  function getById(id) { return DB.getById('accounts', id); }

  function getBalance(id) {
    const acc = getById(id);
    if (!acc) return 0;
    let bal = acc.initialBalance || 0;
    DB.get('transactions').forEach(tx => {
      if (tx.accountId === id) {
        if (tx.type === 'income') bal += tx.amount;
        else if (tx.type === 'expense') bal -= tx.amount;
        else if (tx.type === 'transfer') bal -= tx.amount;
      }
      if (tx.type === 'transfer' && tx.toAccountId === id) bal += tx.amount;
    });
    return bal;
  }

  function getTotalBalance() {
    return getAll().filter(a => a.type !== 'credit').reduce((s, a) => s + getBalance(a.id), 0);
  }

  function create(data) {
    return DB.saveItem('accounts', {
      id: Utils.generateId(), name: data.name,
      type: data.type || 'bank',
      icon: Utils.ACCOUNT_ICONS[data.type] || '🏦',
      initialBalance: parseFloat(data.initialBalance) || 0,
      color: data.color || '#6C63FF', createdAt: Date.now()
    });
  }

  function update(id, data) {
    const acc = getById(id);
    if (!acc) return null;
    return DB.saveItem('accounts', {
      ...acc, ...data,
      icon: Utils.ACCOUNT_ICONS[data.type || acc.type] || acc.icon,
      initialBalance: parseFloat(data.initialBalance !== undefined ? data.initialBalance : acc.initialBalance)
    });
  }

  function remove(id) {
    DB.deleteItem('accounts', id);
    DB.set('transactions', DB.get('transactions').filter(tx => tx.accountId !== id && tx.toAccountId !== id));
  }

  function renderCard(acc) {
    const t = window.i18n.t;
    const bal = getBalance(acc.id);
    const neg = bal < 0;
    return `
      <div class="account-card" style="--acc-color:${acc.color}" data-id="${acc.id}">
        <div class="account-card__header">
          <span class="account-card__icon">${acc.icon}</span>
          <div class="account-card__info">
            <h3 class="account-card__name">${acc.name}</h3>
            <span class="account-card__type">${t('accounts_type_' + acc.type)}</span>
          </div>
          <div class="account-card__actions">
            <button class="btn-icon" onclick="App.editAccount('${acc.id}')">✏️</button>
            <button class="btn-icon" onclick="App.deleteAccount('${acc.id}')">🗑️</button>
          </div>
        </div>
        <div class="account-card__balance">
          <span class="balance-label">${t('accounts_balance')}</span>
          <span class="balance-amount ${neg ? 'negative' : ''}">${Utils.formatCurrency(bal)}</span>
        </div>
      </div>`;
  }

  function renderList() {
    const t = window.i18n.t;
    const accs = getAll();
    const el = document.getElementById('accounts-grid');
    if (!el) return;
    el.innerHTML = accs.length
      ? accs.map(renderCard).join('')
      : `<div class="empty-state"><span class="empty-state__icon">🏦</span><p>${t('accounts_empty')}</p></div>`;
    const tot = document.getElementById('accounts-total-balance');
    if (tot) tot.textContent = Utils.formatCurrency(getTotalBalance());
  }

  return { getAll, getById, getBalance, getTotalBalance, create, update, remove, renderList };
})();
window.Accounts = Accounts;

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────
const Transactions = (() => {
  function getAll(f = {}) {
    let txs = DB.get('transactions');
    if (f.type && f.type !== 'all') txs = txs.filter(tx => tx.type === f.type);
    if (f.month)     txs = txs.filter(tx => tx.date && tx.date.startsWith(f.month));
    if (f.accountId) txs = txs.filter(tx => tx.accountId === f.accountId || tx.toAccountId === f.accountId);
    if (f.search)    { const q = f.search.toLowerCase(); txs = txs.filter(tx => tx.description.toLowerCase().includes(q)); }
    if (f.from)      txs = txs.filter(tx => tx.date >= f.from);
    if (f.to)        txs = txs.filter(tx => tx.date <= f.to);
    return txs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  function create(data) {
    return DB.saveItem('transactions', {
      id: Utils.generateId(), type: data.type,
      amount: parseFloat(data.amount),
      categoryKey: data.categoryKey,
      description: data.description || '',
      date: data.date || Utils.getTodayStr(),
      accountId: data.accountId,
      toAccountId: data.toAccountId || null,
      createdAt: Date.now()
    });
  }

  function update(id, data) {
    const tx = DB.getById('transactions', id);
    if (!tx) return null;
    return DB.saveItem('transactions', { ...tx, ...data, amount: parseFloat(data.amount || tx.amount) });
  }

  function remove(id) { DB.deleteItem('transactions', id); }

  function getMonthSummary(month) {
    const txs = getAll({ month });
    const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }

  function getByCategory(month) {
    const map = {};
    getAll({ month, type: 'expense' }).forEach(tx => { map[tx.categoryKey] = (map[tx.categoryKey] || 0) + tx.amount; });
    return map;
  }

  function getSpentInCategory(catKey, month) {
    return getAll({ month, type: 'expense' }).filter(tx => tx.categoryKey === catKey).reduce((s, t) => s + t.amount, 0);
  }

  function renderRow(tx) {
    const t = window.i18n.t;
    const cat = Utils.getCategoryInfo(tx.categoryKey, tx.type);
    const acc = Accounts.getById(tx.accountId);
    const isIncome = tx.type === 'income', isTransfer = tx.type === 'transfer';
    const cls = isIncome ? 'income' : isTransfer ? 'transfer' : 'expense';
    const sign = isIncome ? '+' : isTransfer ? '⇄' : '-';
    return `
      <div class="tx-row" data-id="${tx.id}">
        <div class="tx-row__icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div>
        <div class="tx-row__info">
          <span class="tx-row__desc">${tx.description || t('cat_' + tx.categoryKey)}</span>
          <span class="tx-row__meta">${Utils.formatDate(tx.date)}${acc ? ' · ' + acc.icon + ' ' + acc.name : ''}</span>
        </div>
        <div class="tx-row__right">
          <span class="tx-row__amount ${cls}">${sign} ${Utils.formatCurrency(tx.amount)}</span>
          <div class="tx-row__actions">
            <button class="btn-icon" onclick="App.editTransaction('${tx.id}')">✏️</button>
            <button class="btn-icon" onclick="App.deleteTransaction('${tx.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
  }

  function renderList(f = {}) {
    const t = window.i18n.t;
    const txs = getAll(f);
    const el = document.getElementById('transactions-list');
    if (!el) return;
    el.innerHTML = txs.length
      ? txs.map(renderRow).join('')
      : `<div class="empty-state"><span class="empty-state__icon">💸</span><p>${t('transactions_empty')}</p></div>`;
  }

  return { getAll, create, update, remove, getMonthSummary, getByCategory, getSpentInCategory, renderList, renderRow };
})();
window.Transactions = Transactions;

// ─── BUDGETS ───────────────────────────────────────────────────────────────
const Budgets = (() => {
  function getAll(month) {
    return DB.get('budgets').filter(b => b.month === (month || Utils.getCurrentMonth()));
  }
  function create(data) {
    return DB.saveItem('budgets', {
      id: Utils.generateId(), categoryKey: data.categoryKey,
      monthlyLimit: parseFloat(data.monthlyLimit),
      month: data.month || Utils.getCurrentMonth(),
      alertThreshold: parseInt(data.alertThreshold) || 80
    });
  }
  function update(id, data) {
    const b = DB.getById('budgets', id);
    if (!b) return null;
    return DB.saveItem('budgets', { ...b, ...data,
      monthlyLimit: parseFloat(data.monthlyLimit || b.monthlyLimit),
      alertThreshold: parseInt(data.alertThreshold || b.alertThreshold)
    });
  }
  function remove(id) { DB.deleteItem('budgets', id); }

  function getStatus(b) {
    const spent = Transactions.getSpentInCategory(b.categoryKey, b.month);
    const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    return { spent, pct: Math.min(pct, 100), over: pct > 100, alert: pct >= b.alertThreshold };
  }

  function getAlerts(month) {
    return getAll(month).filter(b => { const { alert, over } = getStatus(b); return alert || over; });
  }

  function renderCard(b) {
    const t = window.i18n.t;
    const cat = Utils.getCategoryInfo(b.categoryKey, 'expense');
    const { spent, pct, over, alert } = getStatus(b);
    const rem = b.monthlyLimit - spent;
    const barColor = over ? '#FF6584' : alert ? '#FF9F40' : '#00D9A3';
    return `
      <div class="budget-card ${over ? 'over' : alert ? 'alert' : ''}" data-id="${b.id}">
        <div class="budget-card__header">
          <span class="budget-card__icon">${cat.icon}</span>
          <div class="budget-card__info">
            <h3 class="budget-card__name">${t('cat_' + b.categoryKey)}</h3>
            ${over ? `<span class="budget-badge over">${t('budgets_over')}</span>` : alert ? `<span class="budget-badge alert">⚠️ ${Math.round(pct)}%</span>` : ''}
          </div>
          <div class="budget-card__actions">
            <button class="btn-icon" onclick="App.editBudget('${b.id}')">✏️</button>
            <button class="btn-icon" onclick="App.deleteBudget('${b.id}')">🗑️</button>
          </div>
        </div>
        <div class="budget-card__amounts">
          <div><span class="label">${t('budgets_spent')}</span><span class="amount expense">${Utils.formatCurrency(spent)}</span></div>
          <div><span class="label">${t('budgets_limit')}</span><span class="amount">${Utils.formatCurrency(b.monthlyLimit)}</span></div>
          <div><span class="label">${t('budgets_remaining')}</span><span class="amount ${rem < 0 ? 'expense' : 'income'}">${Utils.formatCurrency(rem)}</span></div>
        </div>
        <div class="budget-progress"><div class="budget-progress__bar" style="background:${barColor};width:${pct}%"></div></div>
        <div class="budget-pct">${Math.round(pct)}%</div>
      </div>`;
  }

  function renderList(month) {
    const t = window.i18n.t;
    const buds = getAll(month);
    const el = document.getElementById('budgets-grid');
    if (!el) return;
    el.innerHTML = buds.length
      ? buds.map(renderCard).join('')
      : `<div class="empty-state"><span class="empty-state__icon">📅</span><p>${t('budgets_empty')}</p></div>`;
  }

  return { getAll, create, update, remove, getStatus, getAlerts, renderList };
})();
window.Budgets = Budgets;

// ─── GOALS ─────────────────────────────────────────────────────────────────
const Goals = (() => {
  function getAll()     { return DB.get('goals'); }
  function getById(id)  { return DB.getById('goals', id); }

  function create(data) {
    return DB.saveItem('goals', {
      id: Utils.generateId(), name: data.name,
      targetAmount: parseFloat(data.targetAmount),
      currentAmount: parseFloat(data.currentAmount) || 0,
      deadline: data.deadline || '', icon: data.icon || '🎯',
      color: data.color || '#6C63FF', createdAt: Date.now()
    });
  }
  function update(id, data) {
    const g = getById(id);
    if (!g) return null;
    return DB.saveItem('goals', { ...g, ...data,
      targetAmount: parseFloat(data.targetAmount || g.targetAmount),
      currentAmount: parseFloat(data.currentAmount !== undefined ? data.currentAmount : g.currentAmount)
    });
  }
  function addAmount(id, amount) {
    const g = getById(id);
    if (!g) return null;
    return DB.saveItem('goals', { ...g, currentAmount: Math.min(g.currentAmount + parseFloat(amount), g.targetAmount) });
  }
  function remove(id) { DB.deleteItem('goals', id); }

  function renderCard(g) {
    const t = window.i18n.t;
    const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
    const done = pct >= 100;
    const rem  = Math.max(g.targetAmount - g.currentAmount, 0);
    const days = g.deadline ? Utils.daysUntil(g.deadline) : null;
    const r = 36, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
    return `
      <div class="goal-card" data-id="${g.id}" style="--goal-color:${g.color}">
        <div class="goal-card__header">
          <div class="goal-card__circle">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="${r}" fill="none" stroke="${g.color}22" stroke-width="7"/>
              <circle cx="40" cy="40" r="${r}" fill="none" stroke="${g.color}" stroke-width="7"
                stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ / 4}"
                stroke-linecap="round" style="transition:stroke-dasharray .8s ease"/>
              <text x="40" y="46" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${Math.round(pct)}%</text>
            </svg>
          </div>
          <div class="goal-card__info">
            <span class="goal-card__emoji">${g.icon}</span>
            <h3 class="goal-card__name">${g.name}</h3>
            ${done ? `<span class="goal-completed">${t('goals_completed')}</span>` : ''}
            ${days !== null ? `<span class="goal-deadline">${days > 0 ? days + ' días' : '¡Vencida!'}</span>` : ''}
          </div>
          <div class="goal-card__actions">
            <button class="btn-icon" onclick="App.editGoal('${g.id}')">✏️</button>
            <button class="btn-icon" onclick="App.deleteGoal('${g.id}')">🗑️</button>
          </div>
        </div>
        <div class="goal-card__amounts">
          <div><span class="label">${t('goals_saved')}</span><span class="amount income">${Utils.formatCurrency(g.currentAmount)}</span></div>
          <div><span class="label">${t('goals_target')}</span><span class="amount">${Utils.formatCurrency(g.targetAmount)}</span></div>
          <div><span class="label">${t('goals_remaining')}</span><span class="amount expense">${Utils.formatCurrency(rem)}</span></div>
        </div>
        ${!done ? `<button class="btn-secondary btn-block" onclick="App.addGoalAmount('${g.id}')">${t('goals_add_amount')}</button>` : ''}
      </div>`;
  }

  function renderList() {
    const t = window.i18n.t;
    const goals = getAll();
    const el = document.getElementById('goals-grid');
    if (!el) return;
    el.innerHTML = goals.length
      ? goals.map(renderCard).join('')
      : `<div class="empty-state"><span class="empty-state__icon">🎯</span><p>${t('goals_empty')}</p></div>`;
  }

  return { getAll, getById, create, update, addAmount, remove, renderList };
})();
window.Goals = Goals;
