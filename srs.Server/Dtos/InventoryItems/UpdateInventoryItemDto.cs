namespace srs.Server.Dtos.InventoryItems
{
    public class UpdateInventoryItemDto
    {
        public string ItemName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public int? SupplierId { get; set; }
    }
}
