const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');

// Load TM logo as Base64 for PDFKit/pdfmake
let tmLogoBase64 = null;
try {
  const logoPath = path.join(__dirname, '../assets/tm_logo.png');
  if (fs.existsSync(logoPath)) {
    tmLogoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath).toString('base64');
  }
} catch (e) {
  console.error('Error reading tm_logo.png:', e.message);
}

// Use standard Helvetica fonts built into pdfmake/pdfkit
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

/**
 * Format currency in INR
 */
const formatINR = (val) => {
  const num = Number(val) || 0;
  return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Format date cleanly
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Generate PDF stream for a sales bill
 * @param {Object} bill - Bill populated with customer and items.product
 * @param {Object} settings - Store settings
 * @returns {PDFKit.PDFDocument} pdfDoc stream
 */
const generateBillPdfStream = (bill, settings = {}) => {
  const shopPhone = settings.phone || 'N/A';
  const shopEmail = settings.email || '';
  const shopGst = settings.gstNumber || 'N/A';
  const shopAddress = settings.address
    ? [settings.address.street, settings.address.city, settings.address.state, settings.address.pincode]
        .filter(Boolean)
        .join(', ')
    : '';

  const bank = settings.bankDetails || {};
  const upiId = settings.upiId || '';

  // Build items rows (Without Taxable Amt column)
  const tableBody = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Item / Mobile Model', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Price Per Unit', style: 'tableHeader', alignment: 'right' },
      { text: 'GST', style: 'tableHeader', alignment: 'right' },
      { text: 'Total Amount', style: 'tableHeader', alignment: 'right' },
    ],
  ];

  if (bill.items && Array.isArray(bill.items)) {
    bill.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';
      const itemName = item.name || item.product?.name || 'Mobile Product';

      // Build item name with IMEI if available
      const imeiList = item.product?.imeiList;
      const hasImei = item.product?.imeiTracking && Array.isArray(imeiList) && imeiList.length > 0;
      const itemNameContent = hasImei
        ? {
            stack: [
              { text: itemName, fontSize: 9, bold: true },
              { text: `IMEI: ${imeiList.join(', ')}`, fontSize: 7, color: '#64748B', margin: [0, 2, 0, 0] },
            ],
            fillColor: rowBg,
          }
        : { text: itemName, fillColor: rowBg, fontSize: 9, bold: true };

      tableBody.push([
        { text: String(index + 1), alignment: 'center', fillColor: rowBg, fontSize: 9 },
        itemNameContent,
        { text: String(item.quantity || 1), alignment: 'center', fillColor: rowBg, fontSize: 9 },
        { text: formatINR(item.sellingPrice), alignment: 'right', fillColor: rowBg, fontSize: 9 },
        {
          text: `${formatINR(item.gstAmount)}\n(${item.gstRate || 0}%)`,
          alignment: 'right',
          fillColor: rowBg,
          fontSize: 8,
          color: '#64748B',
        },
        { text: formatINR(item.total), alignment: 'right', fillColor: rowBg, fontSize: 9, bold: true },
      ]);
    });
  }

  // Calculate Totals: Old Outstanding Amount + Current Bill Amount (Subtotal + GST + Packing Charges) = Grand Total
  const outstandingAmount = typeof bill.outstandingAmount === 'number'
    ? bill.outstandingAmount
    : 0;
  const subtotal = Number(bill.subtotal) || 0;
  const gstAmount = Number(bill.gstAmount) || 0;
  const packingCharges = Number(bill.discount) || 0;
  const currentBillTotal = Number(bill.finalAmount) > 0
    ? Number(bill.finalAmount)
    : (subtotal + gstAmount + packingCharges);
  const grandTotal = outstandingAmount + currentBillTotal;

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 40],
    content: [
      // Top Header Row with Luxury TM Logo & Unique Branding
      {
        columns: [
          // Left: TM Logo & Store Branding
          {
            width: '*',
            stack: [
              {
                columns: [
                  // Metallic TM Logo Image
                  tmLogoBase64
                    ? {
                        width: 52,
                        image: tmLogoBase64,
                        fit: [52, 52],
                      }
                    : {
                        width: 48,
                        table: {
                          widths: [44],
                          heights: [40],
                          body: [
                            [
                              {
                                text: 'TM',
                                color: '#D97706',
                                fontSize: 18,
                                bold: true,
                                alignment: 'center',
                                margin: [0, 6, 0, 0],
                                fillColor: '#0F172A',
                              },
                            ],
                          ],
                        },
                        layout: 'noBorders',
                      },
                  // Brand Name text next to badge: TM MOBILES in unique luxury color
                  {
                    width: '*',
                    margin: [10, 2, 0, 0],
                    stack: [
                      {
                        text: [
                          { text: 'TM ', color: '#D97706', fontSize: 18, bold: true },
                          { text: 'MOBILES', color: '#0F172A', fontSize: 18, bold: true },
                        ],
                        letterSpacing: 1,
                      },
                      {
                        text: 'ALL BRAND MOBILES & ACCESSORIES WHOLESALE',
                        fontSize: 7.2,
                        bold: true,
                        color: '#B45309',
                        margin: [0, 2, 0, 0],
                        letterSpacing: 0.3,
                      },
                    ],
                  },
                ],
              },
              // Store contact info
              {
                margin: [0, 8, 0, 0],
                stack: [
                  shopAddress ? { text: shopAddress, fontSize: 8, color: '#334155' } : null,
                  {
                    text: `Phone: ${shopPhone}${shopEmail ? ' | Email: ' + shopEmail : ''}`,
                    fontSize: 8,
                    color: '#334155',
                  },
                  { text: `GSTIN: ${shopGst}`, fontSize: 8, bold: true, color: '#1E293B' },
                ].filter(Boolean),
              },
            ],
          },
          // Right: INVOICE Header & Metadata
          {
            width: 180,
            alignment: 'right',
            stack: [
              { text: 'INVOICE', fontSize: 20, bold: true, color: '#D97706', margin: [0, 0, 0, 6] },
              {
                text: [
                  { text: 'Bill No: ', bold: true, color: '#475569', fontSize: 9 },
                  { text: bill.billNumber || '-', bold: true, color: '#0F172A', fontSize: 9.5 },
                ],
                margin: [0, 0, 0, 2],
              },
              {
                text: [
                  { text: 'Date: ', bold: true, color: '#475569', fontSize: 9 },
                  { text: formatDate(bill.billDate || bill.createdAt), color: '#0F172A', fontSize: 9 },
                ],
              },
            ],
          },
        ],
      },

      // Accent Divider bar
      {
        canvas: [
          { type: 'rect', x: 0, y: 8, w: 320, h: 3, color: '#D97706' },
          { type: 'rect', x: 320, y: 8, w: 203, h: 3, color: '#0F172A' },
          { type: 'rect', x: 0, y: 12, w: 523, h: 1, color: '#E2E8F0' },
        ],
        margin: [0, 5, 0, 14],
      },

      // Billed To (Customer Information Box - Owner & Address Removed)
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#F8FAFC',
                borderColor: ['#CBD5E1', '#CBD5E1', '#CBD5E1', '#CBD5E1'],
                margin: [8, 6, 8, 6],
                stack: [
                  { text: 'BILLED TO:', fontSize: 8, bold: true, color: '#64748B', margin: [0, 0, 0, 2] },
                  {
                    columns: [
                      {
                        width: '*',
                        stack: [
                          {
                            text: bill.customer?.shopName || 'Retail Customer',
                            fontSize: 11,
                            bold: true,
                            color: '#0F172A',
                          },
                        ],
                      },
                      {
                        width: '*',
                        alignment: 'right',
                        stack: [
                          { text: `Phone: ${bill.customer?.phone || '-'}`, fontSize: 9, color: '#334155' },
                          { text: `GSTIN: ${bill.customer?.gstNumber || 'N/A'}`, fontSize: 9, color: '#334155' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 14],
      },

      // Itemized Table (Taxable Amt Column Removed)
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 35, 85, 75, 90],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#1E293B' : '#E2E8F0'),
          vLineColor: () => '#E2E8F0',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 14],
      },

      // Totals Summary Box & Bank Details
      {
        columns: [
          // Left: Payment & Bank Details
          {
            width: '*',
            stack: [
              bank.bankName || upiId
                ? {
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            fillColor: '#F8FAFC',
                            margin: [6, 6, 6, 6],
                            stack: [
                              {
                                text: 'PAYMENT & BANK DETAILS',
                                fontSize: 8,
                                bold: true,
                                color: '#4F46E5',
                                margin: [0, 0, 0, 3],
                              },
                              bank.bankName ? { text: `Bank: ${bank.bankName}`, fontSize: 8, color: '#334155' } : null,
                              bank.accountNumber
                                ? { text: `A/C No: ${bank.accountNumber}`, fontSize: 8, color: '#334155' }
                                : null,
                              bank.ifscCode ? { text: `IFSC Code: ${bank.ifscCode}`, fontSize: 8, color: '#334155' } : null,
                              bank.accountHolderName
                                ? { text: `Holder: ${bank.accountHolderName}`, fontSize: 8, color: '#334155' }
                                : null,
                              upiId
                                ? { text: `UPI ID: ${upiId}`, fontSize: 8, bold: true, color: '#0EA5E9', margin: [0, 2, 0, 0] }
                                : null,
                            ].filter(Boolean),
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  }
                : { text: '' },
            ],
          },
          // Right: Subtotal, Total Qty, GST, Packing Charges, Outstanding Amount, Grand Total
          {
            width: 220,
            table: {
              widths: [110, '*'],
              body: [
                [
                  { text: 'Total Quantity:', fontSize: 9, color: '#475569', alignment: 'right' },
                  {
                    text: `${(bill.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} Units`,
                    fontSize: 9,
                    color: '#0F172A',
                    alignment: 'right',
                    bold: true,
                  },
                ],
                [
                  { text: 'Subtotal:', fontSize: 9, color: '#475569', alignment: 'right' },
                  { text: formatINR(subtotal), fontSize: 9, color: '#0F172A', alignment: 'right', bold: true },
                ],
                [
                  { text: 'GST Amount:', fontSize: 9, color: '#475569', alignment: 'right' },
                  { text: formatINR(gstAmount), fontSize: 9, color: '#0F172A', alignment: 'right', bold: true },
                ],
                packingCharges > 0
                  ? [
                      { text: 'Packing Charges:', fontSize: 9, color: '#475569', alignment: 'right' },
                      { text: `+ ${formatINR(packingCharges)}`, fontSize: 9, color: '#0F172A', alignment: 'right', bold: true },
                    ]
                  : null,
                [
                  { text: 'Old Outstanding Amount:', fontSize: 9, color: '#475569', alignment: 'right' },
                  { text: formatINR(outstandingAmount), fontSize: 9, color: outstandingAmount > 0 ? '#DC2626' : '#0F172A', alignment: 'right', bold: true },
                ],
                [
                  {
                    text: 'GRAND TOTAL:',
                    fontSize: 10,
                    bold: true,
                    color: '#FFFFFF',
                    fillColor: '#4F46E5',
                    alignment: 'right',
                    margin: [0, 4, 0, 4],
                  },
                  {
                    text: formatINR(grandTotal),
                    fontSize: 12,
                    bold: true,
                    color: '#FFFFFF',
                    fillColor: '#4F46E5',
                    alignment: 'right',
                    margin: [0, 3, 0, 3],
                  },
                ],
              ].filter(Boolean),
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => '#CBD5E1',
            },
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Signature Section (Terms & Conditions Removed)
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 160,
            alignment: 'center',
            stack: [
              { text: 'For TM Mobiles', fontSize: 9, bold: true, color: '#1E293B', margin: [0, 10, 0, 30] },
              { text: '(Authorized Signatory)', fontSize: 8, color: '#64748B' },
            ],
          },
        ],
      },
    ],

    styles: {
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: '#FFFFFF',
        fillColor: '#1E293B',
        margin: [0, 2, 0, 2],
      },
    },

    footer: function (currentPage, pageCount) {
      return {
        text: `TM Mobiles Sales Bill - Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#94A3B8',
        margin: [0, 10, 0, 0],
      };
    },
  };

  return printer.createPdfKitDocument(docDefinition);
};

/**
 * Generate PDF stream for a customer bill statement & payment history report
 * @param {Object} statement - Customer statement data with bills and payment logs
 * @param {Object} settings - Store settings
 * @returns {PDFKit.PDFDocument} pdfDoc stream
 */
const generateCustomerStatementPdfStream = (statement, settings = {}) => {
  const customer = statement.customer || {};
  const period = statement.period || {};
  const bills = statement.bills || [];
  const payments = statement.payments || [];

  const shopPhone = settings.phone || 'N/A';
  const shopEmail = settings.email || '';
  const shopGst = settings.gstNumber || 'N/A';

  // Build Invoiced Bills Table
  const billsTableBody = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Bill #', style: 'tableHeader' },
      { text: 'Date', style: 'tableHeader' },
      { text: 'Total Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Bill Amount', style: 'tableHeader', alignment: 'right' },
      { text: 'Paid', style: 'tableHeader', alignment: 'right' },
      { text: 'Balance', style: 'tableHeader', alignment: 'right' },
      { text: 'Status', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  if (bills.length === 0) {
    billsTableBody.push([
      { text: 'No bills generated during this period.', colSpan: 8, alignment: 'center', color: '#64748B', fontSize: 9, margin: [0, 4, 0, 4] },
      {}, {}, {}, {}, {}, {}, {},
    ]);
  } else {
    bills.forEach((b, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';
      const totalQty = (b.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const paid = Number(b.paidAmount) || 0;
      const finalAmt = Number(b.finalAmount) || 0;
      const bal = Math.max(0, finalAmt - paid);

      billsTableBody.push([
        { text: String(idx + 1), alignment: 'center', fillColor: rowBg, fontSize: 8.5 },
        { text: b.billNumber, bold: true, fillColor: rowBg, fontSize: 8.5, color: '#4F46E5' },
        { text: formatDate(b.billDate || b.createdAt), fillColor: rowBg, fontSize: 8.5 },
        { text: `${totalQty} pcs`, alignment: 'center', fillColor: rowBg, fontSize: 8.5 },
        { text: formatINR(finalAmt), alignment: 'right', bold: true, fillColor: rowBg, fontSize: 8.5 },
        { text: formatINR(paid), alignment: 'right', color: '#059669', fillColor: rowBg, fontSize: 8.5 },
        { text: formatINR(bal), alignment: 'right', bold: bal > 0, color: bal > 0 ? '#DC2626' : '#64748B', fillColor: rowBg, fontSize: 8.5 },
        { text: b.status || 'Pending', alignment: 'center', bold: true, color: b.status === 'Paid' ? '#059669' : '#D97706', fillColor: rowBg, fontSize: 8 },
      ]);
    });
  }

  // Build Payments Table
  const paymentsTableBody = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Payment Date', style: 'tableHeader' },
      { text: 'Bill #', style: 'tableHeader' },
      { text: 'Method', style: 'tableHeader' },
      { text: 'Amount Paid', style: 'tableHeader', alignment: 'right' },
      { text: 'Notes / Remarks', style: 'tableHeader' },
    ],
  ];

  if (payments.length === 0) {
    paymentsTableBody.push([
      { text: 'No payments recorded during this period.', colSpan: 6, alignment: 'center', color: '#64748B', fontSize: 9, margin: [0, 4, 0, 4] },
      {}, {}, {}, {}, {},
    ]);
  } else {
    payments.forEach((p, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';
      paymentsTableBody.push([
        { text: String(idx + 1), alignment: 'center', fillColor: rowBg, fontSize: 8.5 },
        { text: formatDate(p.paymentDate), fillColor: rowBg, fontSize: 8.5 },
        { text: p.billNumber || '-', bold: true, fillColor: rowBg, fontSize: 8.5, color: '#4F46E5' },
        { text: p.paymentMethod || 'Cash', fillColor: rowBg, fontSize: 8.5 },
        { text: formatINR(p.amount), alignment: 'right', bold: true, color: '#059669', fillColor: rowBg, fontSize: 8.5 },
        { text: p.note || '-', color: '#64748B', fillColor: rowBg, fontSize: 8 },
      ]);
    });
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 40],
    content: [
      // Top Header with Stylish TM Logo & Branding
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                columns: [
                  // Metallic TM Logo Image
                  tmLogoBase64
                    ? {
                        width: 52,
                        image: tmLogoBase64,
                        fit: [52, 52],
                      }
                    : {
                        width: 48,
                        table: {
                          widths: [44],
                          heights: [40],
                          body: [
                            [
                              {
                                text: 'TM',
                                color: '#D97706',
                                fontSize: 18,
                                bold: true,
                                alignment: 'center',
                                margin: [0, 6, 0, 0],
                                fillColor: '#0F172A',
                              },
                            ],
                          ],
                        },
                        layout: 'noBorders',
                      },
                  {
                    width: '*',
                    margin: [10, 2, 0, 0],
                    stack: [
                      {
                        text: [
                          { text: 'TM ', color: '#D97706', fontSize: 18, bold: true },
                          { text: 'MOBILES', color: '#0F172A', fontSize: 18, bold: true },
                        ],
                        letterSpacing: 1,
                      },
                      { text: 'ACCOUNT & BILL STATEMENT', fontSize: 9.5, bold: true, color: '#B45309', margin: [0, 2, 0, 0] },
                    ],
                  },
                ],
              },
            ],
          },
          {
            width: 220,
            alignment: 'right',
            stack: [
              { text: `Phone: ${shopPhone}`, fontSize: 8.5, color: '#475569' },
              shopEmail ? { text: `Email: ${shopEmail}`, fontSize: 8.5, color: '#475569' } : null,
              { text: `GSTIN: ${shopGst}`, fontSize: 8.5, color: '#475569' },
              { text: `Date Generated: ${formatDate(new Date())}`, fontSize: 8.5, bold: true, color: '#1E293B', margin: [0, 3, 0, 0] },
            ].filter(Boolean),
          },
        ],
        margin: [0, 0, 0, 16],
      },

      // Customer Info & Period Banner (Statement summary removed from top, kept only period info)
      {
        table: {
          widths: ['*', 190],
          body: [
            [
              {
                fillColor: '#F1F5F9',
                margin: [8, 8, 8, 8],
                stack: [
                  { text: 'CUSTOMER / RETAIL STORE:', fontSize: 8, color: '#64748B', bold: true },
                  { text: customer.shopName || 'Customer', fontSize: 13, bold: true, color: '#1E293B', margin: [0, 2, 0, 2] },
                  { text: `Owner: ${customer.ownerName || '-'}   |   Phone: ${customer.phone || '-'}`, fontSize: 8.5, color: '#334155' },
                  customer.address ? { text: `Address: ${customer.address}`, fontSize: 8.5, color: '#334155' } : null,
                  customer.gstNumber ? { text: `GSTIN: ${customer.gstNumber}`, fontSize: 8.5, color: '#334155' } : null,
                ].filter(Boolean),
              },
              {
                fillColor: '#EEF2FF',
                margin: [8, 8, 8, 8],
                stack: [
                  { text: 'STATEMENT PERIOD:', fontSize: 8, color: '#4F46E5', bold: true },
                  {
                    text: `${formatDate(period.startDate)} to ${formatDate(period.endDate)}`,
                    fontSize: 10,
                    bold: true,
                    color: '#312E81',
                    margin: [0, 3, 0, 6],
                  },
                  { text: `Total Invoices: ${bills.length}`, fontSize: 8.5, color: '#475569' },
                  { text: `Total Payments: ${payments.length}`, fontSize: 8.5, color: '#475569' },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16],
      },

      // Section 1: Invoiced Bills
      { text: `1. Invoiced Bills in Period (${bills.length})`, fontSize: 11, bold: true, color: '#1E293B', margin: [0, 4, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: [20, 75, 65, 55, 75, 65, 65, 55],
          body: billsTableBody,
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#94A3B8' : '#E2E8F0'),
        },
        margin: [0, 0, 0, 16],
      },

      // Section 2: Payments History Log
      { text: `2. Payments Received in Period (${payments.length})`, fontSize: 11, bold: true, color: '#1E293B', margin: [0, 4, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: [20, 85, 75, 75, 85, '*'],
          body: paymentsTableBody,
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#94A3B8' : '#E2E8F0'),
        },
        margin: [0, 0, 0, 20],
      },

      // Bottom Financial Summary Box (Left Bottom Corner) & Signatory
      {
        columns: [
          // Left Bottom Corner: STATEMENT SUMMARY ONLY
          {
            width: 270,
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#F8FAFC',
                    borderColor: ['#CBD5E1', '#CBD5E1', '#CBD5E1', '#CBD5E1'],
                    margin: [10, 10, 10, 10],
                    stack: [
                      { text: 'STATEMENT SUMMARY', fontSize: 9.5, bold: true, color: '#1E293B', margin: [0, 0, 0, 6] },
                      {
                        columns: [
                          { text: 'Total Invoice Bill Amount:', fontSize: 8.5, color: '#475569' },
                          { text: formatINR(statement.totalBilled), fontSize: 8.5, bold: true, color: '#0F172A', alignment: 'right' },
                        ],
                        margin: [0, 0, 0, 3],
                      },
                      {
                        columns: [
                          { text: 'Total Payments:', fontSize: 8.5, color: '#475569' },
                          { text: `- ${formatINR(statement.totalPaid)}`, fontSize: 8.5, bold: true, color: '#059669', alignment: 'right' },
                        ],
                        margin: [0, 0, 0, 4],
                      },
                      {
                        canvas: [
                          { type: 'line', x1: 0, y1: 2, x2: 240, y2: 2, lineWidth: 0.5, lineColor: '#CBD5E1' },
                        ],
                        margin: [0, 2, 0, 4],
                      },
                      {
                        columns: [
                          { text: 'Closing Balance (Outstanding):', fontSize: 9, bold: true, color: '#1E293B' },
                          {
                            text: formatINR(statement.closingBalance),
                            fontSize: 10.5,
                            bold: true,
                            color: statement.closingBalance > 0 ? '#DC2626' : '#059669',
                            alignment: 'right',
                          },
                        ],
                        margin: [0, 2, 0, 0],
                      },
                    ],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#E2E8F0',
              vLineColor: () => '#E2E8F0',
            },
          },
          {
            width: '*',
            text: '',
          },
          {
            width: 170,
            alignment: 'center',
            stack: [
              { text: 'For TM Mobiles', fontSize: 9, bold: true, color: '#1E293B', margin: [0, 25, 0, 30] },
              { text: '(Authorized Signatory)', fontSize: 8, color: '#64748B' },
            ],
          },
        ],
      },
    ],

    styles: {
      tableHeader: {
        fontSize: 8.5,
        bold: true,
        color: '#FFFFFF',
        fillColor: '#1E293B',
        margin: [0, 3, 0, 3],
      },
    },

    footer: function (currentPage, pageCount) {
      return {
        text: `TM Mobiles Statement Report - Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#94A3B8',
        margin: [0, 10, 0, 0],
      };
    },
  };

  return printer.createPdfKitDocument(docDefinition);
};

module.exports = {
  generateBillPdfStream,
  generateCustomerStatementPdfStream,
};
