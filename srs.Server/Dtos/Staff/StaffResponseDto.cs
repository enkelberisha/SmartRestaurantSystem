namespace srs.Server.Dtos.Staff
{
    using srs.Server.Models.Enums;
    public class StaffResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int RestaurantId { get; set; }
        public StaffPosition Position { get; set; } 
    }
}
