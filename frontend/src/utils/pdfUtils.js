/**
 * Helper utilities to handle PDF downloads, viewing, and printing with bearer authentication
 */

export const getAuthToken = () => {
  try {
    const authData = JSON.parse(localStorage.getItem('techmart_auth') || '{}');
    return authData?.accessToken || '';
  } catch (e) {
    return '';
  }
};

/**
 * Trigger browser download of PDF bill
 */
export const downloadBillPdf = async (billId, billNumber = 'bill') => {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/billing/${billId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to generate PDF bill');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${billNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.error('PDF download error:', err);
    alert('Error downloading PDF bill: ' + (err.message || 'Server error'));
  }
};

/**
 * Open PDF bill in a new tab/window
 */
export const openBillPdf = async (billId) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/billing/${billId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to generate PDF bill');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (err) {
    console.error('PDF open error:', err);
    alert('Error opening PDF bill: ' + (err.message || 'Server error'));
  }
};
