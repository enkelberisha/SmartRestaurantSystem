namespace srs.Server.Dtos.Reports

{
    using srs.Server.Models.Enums;
    public class CreateReportDto
    {
        public int RestaurantId { get; set; }
        public string Message { get; set; } = null!;
        public ReportType Type { get; set; } 
    }
}
