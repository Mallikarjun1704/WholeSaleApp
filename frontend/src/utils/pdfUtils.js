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
 * Format PDF bill filename as shopName_date_indexValue.pdf
 */
export const getBillPdfFileName = (billParam) => {
  if (!billParam) return 'Bill.pdf';
  if (typeof billParam === 'string') {
    if (billParam.endsWith('.pdf')) return billParam;
    return `Bill_${billParam}.pdf`;
  }

  const rawShopName = billParam.customer?.shopName || billParam.customer?.ownerName || billParam.customer?.name || billParam.shopName || 'Customer';
  const cleanShopName = rawShopName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const dateObj = billParam.billDate ? new Date(billParam.billDate) : (billParam.createdAt ? new Date(billParam.createdAt) : new Date());
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const billNumParts = (billParam.billNumber || '').split('-');
  const indexValue = billNumParts.length > 0 ? billNumParts[billNumParts.length - 1] : '1';

  return `${cleanShopName}_${dateStr}_${indexValue}.pdf`;
};

/**
 * Trigger browser download of PDF bill
 */
export const downloadBillPdf = async (billId, billParam) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/billing/${billId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to generate PDF bill');

    // Extract filename from Content-Disposition header if available
    let filename = '';
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    if (!filename) {
      filename = getBillPdfFileName(billParam);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
