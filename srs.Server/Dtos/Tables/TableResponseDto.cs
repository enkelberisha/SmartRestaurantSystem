namespace srs.Server.Dtos.Tables
{
    using srs.Server.Models.Enums;
    public class TableResponseDto
    {
        public int Id { get; set; }
        public int RestaurantId { get; set; }
        public int Number { get; set; }
        public int Capacity { get; set; }
        public TableStatus Status { get; set; }
        public int? AssignedStaffId { get; set; }
    }
}
