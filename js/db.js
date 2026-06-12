// FinanceTracker — localStorage Data Layer

const DB = (() => {
  const P = 'ft_';

  function get(col)       { try { return JSON.parse(localStorage.getItem(P + col)) || []; } catch { return []; } }
  function set(col, data) { localStorage.setItem(P + col, JSON.stringify(data)); }

  function getUser()      { try { return JSON.parse(localStorage.getItem(P + 'user')) || null; } catch { return null; } }
  function saveUser(u)    { localStorage.setItem(P + 'user', JSON.stringify(u)); }
  function clearUser()    { localStorage.removeItem(P + 'user'); }

  function saveItem(col, item) {
    const items = get(col);
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    set(col, items);
    return item;
  }

  function deleteItem(col, id) { set(col, get(col).filter(i => i.id !== id)); }
  function getById(col, id)    { return get(col).find(i => i.id === id) || null; }

  function isFirstRun()    { return !localStorage.getItem(P + 'initialized'); }
  function markInitialized() { localStorage.setItem(P + 'initialized', '1'); }

  function seedDemoData() {
    if (!isFirstRun()) return;

    const now = new Date();
    const curMonth = Utils.getCurrentMonth();
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

    set('accounts', [
      { id: 'acc1', name: 'Banco Atlántida', type: 'bank',    icon: '🏦', initialBalance: 15000, color: '#6C63FF', createdAt: Date.now() },
      { id: 'acc2', name: 'Efectivo',        type: 'cash',   icon: '💵', initialBalance: 2000,  color: '#00D9A3', createdAt: Date.now() },
      { id: 'acc3', name: 'Tarjeta Visa',    type: 'credit', icon: '💳', initialBalance: 0,     color: '#FF6584', createdAt: Date.now() },
    ]);

    const d = days => { const dt = new Date(); dt.setDate(dt.getDate() - days); return dt.toISOString().slice(0, 10); };
    set('transactions', [
      { id: 'tx1',  type: 'income',   amount: 18000, categoryKey: 'salary',        description: 'Salario mensual',         date: d(2),  accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx2',  type: 'expense',  amount: 1850,  categoryKey: 'food',          description: 'Supermercado La Colonia', date: d(3),  accountId: 'acc2', createdAt: Date.now() },
      { id: 'tx3',  type: 'expense',  amount: 650,   categoryKey: 'transport',     description: 'Gasolina',                date: d(4),  accountId: 'acc2', createdAt: Date.now() },
      { id: 'tx4',  type: 'expense',  amount: 2100,  categoryKey: 'services',      description: 'Electricidad y agua',     date: d(5),  accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx5',  type: 'expense',  amount: 450,   categoryKey: 'entertainment', description: 'Netflix y Spotify',       date: d(6),  accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx6',  type: 'expense',  amount: 900,   categoryKey: 'food',          description: 'Restaurante El Patio',    date: d(7),  accountId: 'acc3', createdAt: Date.now() },
      { id: 'tx7',  type: 'income',   amount: 3500,  categoryKey: 'freelance',     description: 'Proyecto web cliente',    date: d(8),  accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx8',  type: 'expense',  amount: 1200,  categoryKey: 'clothing',      description: 'Ropa nueva',              date: d(10), accountId: 'acc3', createdAt: Date.now() },
      { id: 'tx9',  type: 'expense',  amount: 350,   categoryKey: 'health',        description: 'Farmacia',                date: d(11), accountId: 'acc2', createdAt: Date.now() },
      { id: 'tx10', type: 'transfer', amount: 2000,  categoryKey: 'transfer',      description: 'Retiro cajero',           date: d(12), accountId: 'acc1', toAccountId: 'acc2', createdAt: Date.now() },
      { id: 'tx11', type: 'expense',  amount: 800,   categoryKey: 'education',     description: 'Curso online',            date: d(15), accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx12', type: 'income',   amount: 18000, categoryKey: 'salary',        description: 'Salario mensual',         date: prevMonth + '-01', accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx13', type: 'expense',  amount: 2200,  categoryKey: 'food',          description: 'Supermercado',            date: prevMonth + '-05', accountId: 'acc2', createdAt: Date.now() },
      { id: 'tx14', type: 'expense',  amount: 1800,  categoryKey: 'services',      description: 'Servicios básicos',       date: prevMonth + '-08', accountId: 'acc1', createdAt: Date.now() },
      { id: 'tx15', type: 'expense',  amount: 600,   categoryKey: 'transport',     description: 'Gasolina',                date: prevMonth + '-12', accountId: 'acc2', createdAt: Date.now() },
    ]);

    set('budgets', [
      { id: 'bud1', categoryKey: 'food',          monthlyLimit: 3500, month: curMonth, alertThreshold: 80 },
      { id: 'bud2', categoryKey: 'transport',      monthlyLimit: 1500, month: curMonth, alertThreshold: 80 },
      { id: 'bud3', categoryKey: 'entertainment',  monthlyLimit: 800,  month: curMonth, alertThreshold: 75 },
      { id: 'bud4', categoryKey: 'services',       monthlyLimit: 3000, month: curMonth, alertThreshold: 80 },
    ]);

    const yr = now.getFullYear();
    set('goals', [
      { id: 'goal1', name: 'Vacaciones Roatán',     targetAmount: 20000, currentAmount: 6500,  deadline: `${yr}-12-15`, icon: '🏖️', color: '#6C63FF', createdAt: Date.now() },
      { id: 'goal2', name: 'Fondo de emergencia',   targetAmount: 50000, currentAmount: 18000, deadline: `${yr+1}-06-01`, icon: '🛡️', color: '#00D9A3', createdAt: Date.now() },
      { id: 'goal3', name: 'Laptop nueva',          targetAmount: 15000, currentAmount: 9200,  deadline: `${yr}-09-01`, icon: '💻', color: '#FF9F40', createdAt: Date.now() },
    ]);

    markInitialized();
  }

  return { get, set, getUser, saveUser, clearUser, saveItem, deleteItem, getById, isFirstRun, seedDemoData };
})();

window.DB = DB;
