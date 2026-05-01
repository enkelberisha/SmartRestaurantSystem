namespace srs.Server.Dtos.Staff
{
    using srs.Server.Models.Enums;
    public class StaffRequestDto
    {
        public int UserId { get; set; }
        public int RestaurantId { get; set; }
        public StaffPosition Position { get; set; } 
    }
}
