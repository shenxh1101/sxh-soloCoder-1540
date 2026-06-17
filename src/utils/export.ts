export function exportToCSV(data: any[], filename: string, columns: { key: string; label: string }[]) {
  const headers = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns.map((c) => {
      const value = row[c.key];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}
