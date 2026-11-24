const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-02" -> "Nov 2026". Falls back to Date parsing, then to the raw string. */
export function formatMonthYear(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = /^(\d{4})[-/](\d{1,2})/.exec(dateStr);
  if (match) {
    const month = MONTHS[parseInt(match[2], 10) - 1];
    return month ? `${month} ${match[1]}` : match[1];
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return dateStr;
}

/** "1997-04-20" -> "20 Apr 1997". Falls back to the raw string. */
export function formatFullDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateStr);
  if (match) {
    const month = MONTHS[parseInt(match[2], 10) - 1];
    if (month) return `${parseInt(match[3], 10)} ${month} ${match[1]}`;
  }
  return dateStr;
}
