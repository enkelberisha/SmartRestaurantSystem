namespace srs.Server.Dtos.AI;

public class AiMenuDoctorItemDto
{
    public string ItemName { get; set; } = string.Empty;
    public string Status { get; set; } = "healthy";
    public string Insight { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
}
