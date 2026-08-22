const PdfPrinter = require('pdfmake');

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
      const sku = item.product?.sku ? ` (${item.product.sku})` : '';

      tableBody.push([
        { text: String(index + 1), alignment: 'center', fillColor: rowBg, fontSize: 9 },
        { text: `${itemName}${sku}`, fillColor: rowBg, fontSize: 9, bold: true },
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

  // Calculate Totals: Old Outstanding Amount + Current Bill Amount (Subtotal) + GST + Package charge (Packing Charges) = Grand Total
  const outstandingAmount = typeof bill.outstandingAmount === 'number'
    ? bill.outstandingAmount
    : (Number(bill.customer?.pendingCredit) || 0);
  const subtotal = Number(bill.subtotal) || 0;
  const gstAmount = Number(bill.gstAmount) || 0;
  const packingCharges = Number(bill.discount) || 0;
  const grandTotal = outstandingAmount + subtotal + gstAmount + packingCharges;

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 40],
    content: [
      // Top Header Row with Short Name TM Logo & Design
      {
        columns: [
          // Left: Short Name TM Logo Emblem & Design
          {
            width: '*',
            stack: [
              {
                columns: [
                  // Stylish TM Logo Badge
                  {
                    width: 44,
                    table: {
                      widths: [44],
                      heights: [38],
                      body: [
                        [
                          {
                            text: 'TM',
                            fillColor: '#4F46E5',
                            color: '#FFFFFF',
                            fontSize: 20,
                            bold: true,
                            alignment: 'center',
                            margin: [0, 6, 0, 0],
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                  // Brand Name text next to badge: TM Mobiles
                  {
                    width: '*',
                    margin: [10, 0, 0, 0],
                    stack: [
                      { text: 'TM MOBILES', fontSize: 18, bold: true, color: '#4F46E5', letterSpacing: 1 },
                      {
                        text: 'ALL BRAND MOBILES AVAILABLE IN ONE PLACE',
                        fontSize: 7.5,
                        bold: true,
                        color: '#0EA5E9',
                        margin: [0, 2, 0, 0],
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
              { text: 'INVOICE', fontSize: 20, bold: true, color: '#4F46E5', margin: [0, 0, 0, 6] },
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
          { type: 'rect', x: 0, y: 8, w: 523, h: 3, color: '#4F46E5' },
          { type: 'rect', x: 0, y: 12, w: 523, h: 1, color: '#0EA5E9' },
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

module.exports = {
  generateBillPdfStream,
};
