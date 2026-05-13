namespace srs.Server.Dtos.Tables
{
    using srs.Server.Models.Enums;
    public class TableRequestDto
    {
        public int RestaurantId { get; set; }
        public int Number { get; set; }
        public int Capacity { get; set; }
        public TableStatus Status { get; set; }
        public int? AssignedStaffId { get; set; }
        public bool NeedsAssistance { get; set; }
        public bool RequestBill { get; set; }
    }
}
