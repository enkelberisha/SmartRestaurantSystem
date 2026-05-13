import { buildPurchaseOrderPdfModel } from "@/manager/services/purchaseOrderPdfModel";
import { purchaseOrderPdfTheme, renderPdfDocument } from "@/manager/services/pdfDocumentTemplate";
import type { ManagerPurchaseOrder } from "@/manager/types";

type PurchaseOrderPdfOptions = {
    restaurantName: string;
    reportDate: string;
    orders: ManagerPurchaseOrder[];
};

export function downloadPurchaseOrdersPdf(options: PurchaseOrderPdfOptions) {
    const model = buildPurchaseOrderPdfModel(options);
    renderPdfDocument(model, purchaseOrderPdfTheme);
}
