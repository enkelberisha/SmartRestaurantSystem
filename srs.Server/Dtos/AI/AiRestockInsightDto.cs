namespace srs.Server.Dtos.AI;

public class AiRestockInsightDto
{
    public string ItemName { get; set; } = string.Empty;
    public string Urgency { get; set; } = "normal";
    public string Insight { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? SupplierName { get; set; }
}
