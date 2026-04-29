namespace srs.Server.Dtos.Reports
{
    using srs.Server.Models.Enums;
    public class ReportResponseDto
    {
        

        public int Id { get; set; }
        public int RestaurantId { get; set; }
        public string Message { get; set; } = null!;
        public ReportType Type { get; set; } 
        public DateTime CreatedAt { get; set; }
    }
}
