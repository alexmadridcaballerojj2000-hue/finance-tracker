// FinanceTracker — Export Module (CSV + PDF)
const Export = (() => {

  function toCSV(transactions) {
    const t = window.i18n.t;
    const headers = ['Fecha','Tipo','Categoría','Descripción','Cuenta','Monto (L.)'].join(',');
    const rows = transactions.map(tx => {
      const acc = Accounts.getById(tx.accountId);
      return [
        tx.date,
        t('form_' + tx.type),
        t('cat_' + tx.categoryKey),
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        acc ? acc.name : '',
        tx.amount.toFixed(2)
      ].join(',');
    });
    download([headers, ...rows].join('\n'), `financetracker_${Utils.getTodayStr()}.csv`, 'text/csv;charset=utf-8;');
  }

  function toPDF(transactions, summary, period) {
    const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFLib) { alert('La librería PDF aún no cargó. Intenta de nuevo en un momento.'); return; }
    const doc = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const t = window.i18n.t;
    const W = doc.internal.pageSize.getWidth();
    let y = 0;

    // Header bar
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, W, 42, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22); doc.setFont('helvetica','bold');
    doc.text('FinanceTracker', 15, 20);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(period || t('reports_title'), 15, 30);
    doc.text(`Exportado: ${Utils.formatDate(Utils.getTodayStr())}`, W - 15, 30, { align: 'right' });
    y = 55;

    // Summary boxes
    const boxes = [
      { label: t('reports_total_income'),   value: Utils.formatCurrency(summary.income),   r:0, g:217, b:163 },
      { label: t('reports_total_expenses'), value: Utils.formatCurrency(summary.expenses), r:255, g:101, b:132 },
      { label: t('reports_net'),            value: Utils.formatCurrency(summary.net),       r:108, g:99, b:255 },
    ];
    const bw = (W - 40) / 3;
    boxes.forEach((box, i) => {
      const x = 15 + i * (bw + 5);
      doc.setFillColor(box.r, box.g, box.b);
      doc.roundedRect(x, y, bw, 22, 3, 3, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(box.label, x + 4, y + 8);
      doc.setFontSize(12); doc.setFont('helvetica','bold');
      doc.text(box.value, x + 4, y + 18);
    });
    y += 32;

    // Table header
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setFillColor(235,235,255); doc.rect(10, y, W - 20, 8, 'F');
    doc.setTextColor(50,50,80);
    doc.text('Fecha', 13, y + 5.5);
    doc.text('Descripción', 35, y + 5.5);
    doc.text('Categoría', 100, y + 5.5);
    doc.text('Tipo', 138, y + 5.5);
    doc.text('Monto', W - 13, y + 5.5, { align: 'right' });
    y += 10;
    doc.setFont('helvetica','normal');

    transactions.forEach((tx, i) => {
      if (y > 272) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(248,248,255); doc.rect(10, y - 3, W - 20, 7, 'F'); }
      const isInc = tx.type === 'income';
      doc.setTextColor(50,50,80);
      doc.text(tx.date, 13, y + 1.5);
      const desc = (tx.description || '').slice(0, 35);
      doc.text(desc, 35, y + 1.5);
      doc.text(window.i18n.t('cat_' + tx.categoryKey), 100, y + 1.5);
      doc.text(window.i18n.t('form_' + tx.type), 138, y + 1.5);
      doc.setTextColor(isInc ? 0 : 200, isInc ? 150 : 0, isInc ? 80 : 0);
      doc.text((isInc ? '+' : '-') + ' ' + Utils.formatCurrency(tx.amount), W - 13, y + 1.5, { align: 'right' });
      y += 7;
    });

    doc.setTextColor(180,180,180); doc.setFontSize(8);
    doc.text('Generado por FinanceTracker', W / 2, 290, { align: 'center' });
    doc.save(`financetracker_${Utils.getTodayStr()}.pdf`);
  }

  function download(content, filename, mime) {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type: mime })),
      download: filename
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  return { toCSV, toPDF };
})();
window.Export = Export;
