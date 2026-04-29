namespace srs.Server.Dtos.InventoryItems
{
    public class InventoryItemResponseDto
    {
        public int Id { get; set; }
        public int InventoryId { get; set; }
        public string ItemName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public int? SupplierId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
