// FinanceTracker — Charts Module (Chart.js)
const Charts = (() => {
  let _donut = null, _bars = null;

  function destroy(c) { try { if (c) c.destroy(); } catch(e){} return null; }

  function renderDonut(canvasId, month) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    _donut = destroy(_donut);
    const byCat = Transactions.getByCategory(month);
    const keys  = Object.keys(byCat);
    if (!keys.length) return;
    _donut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: keys.map(k => window.i18n.t('cat_' + k)),
        datasets: [{
          data: keys.map(k => byCat[k]),
          backgroundColor: keys.map(k => Utils.getCategoryInfo(k, 'expense').color),
          borderWidth: 0, hoverOffset: 8
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, color: '#CBD5E0', font: { family: 'Inter' } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${Utils.formatCurrency(ctx.raw)}` } }
        },
        animation: { animateRotate: true, duration: 800 }
      }
    });
  }

  function renderBars(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    _bars = destroy(_bars);
    const months = Utils.last6Months();
    const labels  = months.map(m => window.i18n.t('months_' + (parseInt(m.split('-')[1]) - 1)).slice(0, 3));
    _bars = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: window.i18n.t('dashboard_income'),   data: months.map(m => Transactions.getMonthSummary(m).income),   backgroundColor: '#00D9A399', borderRadius: 6 },
          { label: window.i18n.t('dashboard_expenses'), data: months.map(m => Transactions.getMonthSummary(m).expenses), backgroundColor: '#FF658499', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, color: '#CBD5E0', font: { family: 'Inter' } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { color: '#ffffff08' }, ticks: { color: '#8892A4' } },
          y: { grid: { color: '#ffffff08' }, ticks: { color: '#8892A4', callback: v => 'L ' + (v/1000).toFixed(0) + 'k' } }
        },
        animation: { duration: 600 }
      }
    });
  }

  function refresh(month) {
    renderDonut('chart-donut', month);
    renderBars('chart-bars');
  }

  return { refresh };
})();
window.Charts = Charts;
