// FinanceTracker — Internationalization

const I18N = (() => {
  let _translations = {};
  let _lang = localStorage.getItem('ft_language') || 'es';

  async function load(lang) {
    try {
      const res = await fetch(`locales/${lang}.json?v=2`);
      _translations = await res.json();
      _lang = lang;
      localStorage.setItem('ft_language', lang);
      document.documentElement.lang = lang;
      applyToDOM();
    } catch (e) {
      console.error('i18n load error', e);
    }
  }

  function t(key) {
    return _translations[key] || key;
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  function getLanguage() { return _lang; }

  async function setLanguage(lang) {
    await load(lang);
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    if (window.App) window.App.refresh();
  }

  async function init() {
    await load(_lang);
  }

  return { init, t, setLanguage, getLanguage, applyToDOM };
})();

window.i18n = I18N;
