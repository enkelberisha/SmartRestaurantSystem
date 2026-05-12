import { jsPDF } from "jspdf";

export type PdfDocumentColumn = {
    key: string;
    label: string;
    x: number;
    width: number;
    align?: "left" | "center" | "right";
};

export type PdfDocumentRow = {
    cells: Record<string, string>;
};

export type PdfDocumentSummaryRow = {
    label: string;
    value: string;
    emphasized?: boolean;
};

export type PdfDocumentModel = {
    fileName: string;
    title: string;
    headerBrand: string;
    headerDate: string;
    billToTitle: string;
    billToName: string;
    billToLines: string[];
    commentTitle: string;
    commentLines: string[];
    footerText: string;
    columns: PdfDocumentColumn[];
    rows: PdfDocumentRow[];
    summaryRows: PdfDocumentSummaryRow[];
};

export type PdfDocumentTheme = {
    pageWidth: number;
    pageHeight: number;
    frameOuter: { x: number; y: number; width: number; height: number };
    frameInner: { x: number; y: number; width: number; height: number };
    rowHeight: number;
    maxRowsPerPage: number;
    headerTableTop: number;
    billToBox: { x: number; y: number; width: number; titleHeight: number; bodyHeight: number };
    commentBox: { x: number; width: number; titleHeight: number; bodyHeight: number };
    summaryLabelBox: { x: number; width: number; height: number };
    summaryValueBox: { x: number; width: number; height: number };
    tableLeft: number;
    tableWidth: number;
    footerY: number;
};

export const purchaseOrderPdfTheme: PdfDocumentTheme = {
    pageWidth: 595.28,
    pageHeight: 841.89,
    frameOuter: { x: 17.01, y: 17.01, width: 561.26, height: 807.87 },
    frameInner: { x: 25.51, y: 25.51, width: 544.26, height: 790.87 },
    rowHeight: 28,
    maxRowsPerPage: 12,
    headerTableTop: 289.13,
    billToBox: { x: 56.69, y: 134.5, width: 192.76, titleHeight: 19.84, bodyHeight: 90.71 },
    commentBox: { x: 56.69, width: 294.8, titleHeight: 19.84, bodyHeight: 99.21 },
    summaryLabelBox: { x: 374.17, width: 92.07, height: 29.76 },
    summaryValueBox: { x: 466.25, width: 66.67, height: 29.76 },
    tableLeft: 56.69,
    tableWidth: 470.55,
    footerY: 807.89
};

function drawHeader(doc: jsPDF, model: PdfDocumentModel, theme: PdfDocumentTheme) {
    doc.setLineWidth(0.57);
    doc.setDrawColor(0);
    doc.rect(theme.frameOuter.x, theme.frameOuter.y, theme.frameOuter.width, theme.frameOuter.height);
    doc.rect(theme.frameInner.x, theme.frameInner.y, theme.frameInner.width, theme.frameInner.height);

    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.text("RECEIPT", 56.69, 73.7);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text(model.headerBrand.toUpperCase(), 388.28, 73.7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SMART RESTAURANT SYSTEM", 391.89, 93.54);
    doc.text(model.title.toUpperCase(), 442.11, 110.54);
    doc.text(model.headerDate, 408, 127.54);

    doc.setFillColor(20, 20, 20);
    doc.rect(theme.billToBox.x, theme.billToBox.y, theme.billToBox.width, theme.billToBox.titleHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(model.billToTitle.toUpperCase(), 65.2, 147.6);
    doc.setTextColor(0, 0, 0);
    doc.rect(theme.billToBox.x, theme.billToBox.y, theme.billToBox.width, theme.billToBox.bodyHeight);

    doc.setFont("times", "bold");
    doc.text(model.billToName.toUpperCase(), 65.2, 170);
    doc.setFont("times", "normal");
    model.billToLines.forEach((line, index) => {
        doc.text(line.toUpperCase(), 65.2, 184.2 + index * 14.2);
    });
}

function drawTableHeader(doc: jsPDF, columns: PdfDocumentColumn[], top: number) {
    doc.setFillColor(20, 20, 20);
    for (const column of columns) {
        doc.rect(column.x, top, column.width, 22.68, "F");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);

    columns.forEach(column => {
        const x = column.align === "center"
            ? column.x + column.width / 2
            : column.align === "right"
                ? column.x + column.width - 8
                : column.x + 8;

        doc.text(column.label.toUpperCase(), x, top + 15.03, {
            align: column.align ?? "left"
        });
    });

    doc.setTextColor(0, 0, 0);
}

function drawTableGrid(doc: jsPDF, columns: PdfDocumentColumn[], top: number, rowCount: number, theme: PdfDocumentTheme) {
    const bottom = top + 22.68 + rowCount * theme.rowHeight;

    for (let index = 0; index < rowCount; index += 1) {
        doc.rect(theme.tableLeft, top + 22.68 + index * theme.rowHeight, theme.tableWidth, theme.rowHeight);
    }

    columns.slice(1).forEach(column => {
        doc.line(column.x, top + 22.68, column.x, bottom);
    });
}

function drawRows(doc: jsPDF, columns: PdfDocumentColumn[], rows: PdfDocumentRow[], top: number, rowStartIndex: number, theme: PdfDocumentTheme) {
    doc.setFont("times", "normal");
    doc.setFontSize(9);

    rows.forEach((row, index) => {
        const rowTop = top + 22.68 + index * theme.rowHeight + 17;

        columns.forEach(column => {
            const value = row.cells[column.key] ?? "";
            const x = column.align === "center"
                ? column.x + column.width / 2
                : column.align === "right"
                    ? column.x + column.width - 8
                    : column.x + 8;

            doc.text(value, x, rowTop, {
                align: column.align ?? "left",
                maxWidth: column.width - 14
            });
        });
    });
}

function drawSummary(doc: jsPDF, model: PdfDocumentModel, totalRowsHeight: number, theme: PdfDocumentTheme) {
    const commentsTop = totalRowsHeight + 25;

    doc.setFillColor(20, 20, 20);
    doc.rect(theme.commentBox.x, commentsTop, theme.commentBox.width, theme.commentBox.titleHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(model.commentTitle.toUpperCase(), 177.95, commentsTop + 13.83, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.rect(theme.commentBox.x, commentsTop + theme.commentBox.titleHeight, theme.commentBox.width, theme.commentBox.bodyHeight);

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.text(model.commentLines, 65.2, commentsTop + 40, { maxWidth: 275 });

    model.summaryRows.forEach((entry, index) => {
        const rowTop = commentsTop + index * theme.summaryLabelBox.height;
        doc.setFillColor(20, 20, 20);
        doc.rect(theme.summaryLabelBox.x, rowTop, theme.summaryLabelBox.width, theme.summaryLabelBox.height, "F");
        doc.rect(theme.summaryValueBox.x, rowTop, theme.summaryValueBox.width, theme.summaryValueBox.height);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(entry.label.toUpperCase(), 382.68, rowTop + 15.6);
        doc.setTextColor(0, 0, 0);
        doc.setFont("times", entry.emphasized ? "bold" : "normal");
        doc.text(entry.value, 503.33, rowTop + 15.6);
    });

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text(model.footerText, theme.pageWidth / 2, theme.footerY, { align: "center" });
}

export function renderPdfDocument(model: PdfDocumentModel, theme: PdfDocumentTheme = purchaseOrderPdfTheme) {
    const doc = new jsPDF({
        unit: "pt",
        format: "a4"
    });

    const pageChunks: PdfDocumentRow[][] = [];

    for (let index = 0; index < model.rows.length; index += theme.maxRowsPerPage) {
        pageChunks.push(model.rows.slice(index, index + theme.maxRowsPerPage));
    }

    pageChunks.forEach((chunk, pageIndex) => {
        if (pageIndex > 0) {
            doc.addPage("a4", "portrait");
        }

        drawHeader(doc, model, theme);
        drawTableHeader(doc, model.columns, theme.headerTableTop);
        drawTableGrid(doc, model.columns, theme.headerTableTop, chunk.length, theme);
        drawRows(doc, model.columns, chunk, theme.headerTableTop, pageIndex * theme.maxRowsPerPage, theme);

        if (pageIndex === pageChunks.length - 1) {
            drawSummary(doc, model, theme.headerTableTop + 22.68 + chunk.length * theme.rowHeight, theme);
        }
    });

    doc.save(model.fileName);
}
