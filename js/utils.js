// FinanceTracker — Utility Functions

const CATEGORIES = {
  expense: [
    { key: 'food',          icon: '🍔', color: '#FF6584' },
    { key: 'transport',     icon: '🚗', color: '#6C63FF' },
    { key: 'home',          icon: '🏠', color: '#00D9A3' },
    { key: 'health',        icon: '💊', color: '#FF9F40' },
    { key: 'entertainment', icon: '🎬', color: '#9B59B6' },
    { key: 'clothing',      icon: '👕', color: '#3498DB' },
    { key: 'education',     icon: '📚', color: '#E67E22' },
    { key: 'services',      icon: '💡', color: '#1ABC9C' },
    { key: 'other_expense', icon: '🔧', color: '#95A5A6' },
  ],
  income: [
    { key: 'salary',       icon: '💼', color: '#00D9A3' },
    { key: 'freelance',    icon: '💻', color: '#6C63FF' },
    { key: 'investments',  icon: '📈', color: '#F39C12' },
    { key: 'gift',         icon: '🎁', color: '#FF6584' },
    { key: 'other_income', icon: '💰', color: '#95A5A6' },
  ],
  transfer: [
    { key: 'transfer', icon: '🔄', color: '#6C63FF' },
  ]
};

const ACCOUNT_ICONS = { bank: '🏦', cash: '💵', credit: '💳', digital: '📱' };

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return 'L ' + num.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const lang = window.i18n ? window.i18n.getLanguage() : 'es';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'es' ? 'es-HN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function getCategoryInfo(key, type) {
  if (type === 'transfer') return { key: 'transfer', icon: '🔄', color: '#6C63FF' };
  const list = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
  return list.find(c => c.key === key) || { key, icon: '💰', color: '#95A5A6' };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'greeting_morning';
  if (h < 18) return 'greeting_afternoon';
  return 'greeting_evening';
}

function getMonthLabel(monthStr) {
  const [y, m] = monthStr.split('-');
  const idx = parseInt(m) - 1;
  const t = window.i18n ? window.i18n.t : (k) => k;
  return `${t('months_' + idx)} ${y}`;
}

function last6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('ft-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'ft-toast';
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

window.Utils = {
  formatCurrency, formatDate, getCurrentMonth, getTodayStr,
  generateId, getCategoryInfo, getGreeting, getMonthLabel,
  last6Months, daysUntil, showToast, CATEGORIES, ACCOUNT_ICONS
};
