import type { PdfDocumentModel } from "@/manager/services/pdfDocumentTemplate";
import type { ManagerPurchaseOrder } from "@/manager/types";

type PurchaseOrderPdfModelOptions = {
    restaurantName: string;
    reportDate: string;
    orders: ManagerPurchaseOrder[];
};

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatReportDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function getSupplierLabel(orders: ManagerPurchaseOrder[]) {
    const supplierNames = [...new Set(orders.map(order => order.supplierName).filter(Boolean))];
    if (supplierNames.length === 0) {
        return "Supplier";
    }

    if (supplierNames.length === 1) {
        return supplierNames[0];
    }

    return "Multiple Suppliers";
}

export function buildPurchaseOrderPdfModel({ restaurantName, reportDate, orders }: PurchaseOrderPdfModelOptions): PdfDocumentModel {
    const subtotal = orders.reduce((sum, order) => sum + order.total, 0);

    return {
        fileName: `purchase-orders-${reportDate}.pdf`,
        title: "Purchase Order",
        headerBrand: restaurantName || "Smart Restaurant",
        headerDate: formatReportDate(reportDate),
        billToTitle: "Bill To:",
        billToName: getSupplierLabel(orders),
        billToLines: [
            "Supplier",
            "Purchase Order Receipt",
            "Daily Inventory Restock"
        ],
        commentTitle: "Comments",
        commentLines: [
            `Daily inventory restock report for ${formatReportDate(reportDate)}.`,
            `${orders.length} purchase order${orders.length === 1 ? "" : "s"} were created and added to stock.`
        ],
        footerText: "THANK YOU FOR YOUR BUSINESS",
        columns: [
            { key: "number", label: "NO.", x: 56.69, width: 34.02 },
            { key: "item", label: "ITEM", x: 90.71, width: 174, align: "center" },
            { key: "supplier", label: "SUPPLIER", x: 264.71, width: 124, align: "center" },
            { key: "quantity", label: "QUANTITY", x: 388.71, width: 60 },
            { key: "total", label: "TOTAL", x: 448.71, width: 78.53 }
        ],
        rows: orders.map((order, index) => ({
            cells: {
                number: String(index + 1),
                item: order.itemName?.trim() || "Inventory item",
                supplier: order.supplierName?.trim() || "Supplier",
                quantity: String(order.quantity ?? 0),
                total: money(order.total)
            }
        })),
        summaryRows: [
            { label: "Subtotal", value: money(subtotal) },
            { label: "Discount", value: money(0) },
            { label: "Taxes", value: money(0) },
            { label: "Grand Total", value: money(subtotal), emphasized: true }
        ]
    };
}
