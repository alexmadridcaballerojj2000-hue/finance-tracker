// FinanceTracker — SPA Router
const Router = (() => {
  const _handlers = {};
  let _current = null;

  function register(route, fn) { _handlers[route] = fn; }
  function navigate(route)     { window.location.hash = route; }
  function getCurrent()        { return _current; }

  function resolve() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';

    if (!Auth.isLoggedIn()) {
      _showView('login'); _current = 'login'; return;
    }

    const valid = ['dashboard','transactions','accounts','budgets','goals','reports'];
    const route = valid.includes(hash) ? hash : 'dashboard';
    _current = route;

    // Highlight active nav
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.route === route)
    );

    _showView(route);
    if (_handlers[route]) _handlers[route]();
  }

  function _showView(name) {
    const shell = document.getElementById('app-shell');
    const login = document.getElementById('view-login');
    if (name === 'login') {
      if (shell) shell.style.display = 'none';
      if (login) login.style.display = 'flex';
    } else {
      if (shell) shell.style.display = 'grid';
      if (login) login.style.display = 'none';
    }
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('active', v.id === 'view-' + name)
    );
  }

  function init() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return { register, navigate, getCurrent, init, resolve };
})();
window.Router = Router;
