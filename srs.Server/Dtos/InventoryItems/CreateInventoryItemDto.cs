namespace srs.Server.Dtos.InventoryItems
{
    public class CreateInventoryItemDto
    {
        public int InventoryId { get; set; }
        public string ItemName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public int? SupplierId { get; set; }
    }
}
