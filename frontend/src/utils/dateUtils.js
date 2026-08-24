/**
 * Returns a local date in 'YYYY-MM-DD' format without UTC timezone skew
 * @param {Date|string|number} date
 * @returns {string} 'YYYY-MM-DD'
 */
export const getLocalDateString = (date = new Date()) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
