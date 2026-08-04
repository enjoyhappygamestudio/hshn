export function formatMoney(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export function formatDateVN(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
