// components/print/usePrint.ts

export function usePrint() {
  const printRecords = (
    containerId: string,
    title: string,
    meta?: string
  ) => {
    const content = document.getElementById(containerId);
    if (!content) {
      console.error(`Element with id "${containerId}" not found`);
      return;
    }

    // Clone the content and remove any no-print elements BEFORE printing
    const clone = content.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      console.error('Failed to open print window');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="UTF-8" />
          <style>
            /* Suppress blank first page from browser chrome */
            @page {
              margin: 16mm;
              size: A4;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 24px;
              margin: 0;
              background: white;
              color: #333;
            }
            .print-title {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #000;
            }
            .print-meta {
              font-size: 12px;
              color: #666;
              margin-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-top: 8px;
            }
            thead {
              background-color: #f3f4f6;
            }
            th {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
              text-align: left;
              font-weight: 600;
              color: #000;
            }
            td {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
              text-align: left;
              vertical-align: top;
            }
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            tbody tr:hover {
              background-color: #f3f4f6;
            }
            @media print {
              body {
                padding: 0;
              }
              table {
                page-break-inside: avoid;
              }
              tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-title">${title}</div>
          ${meta ? `<div class="print-meta">${meta}</div>` : ''}
          ${clone.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return { printRecords };
}
