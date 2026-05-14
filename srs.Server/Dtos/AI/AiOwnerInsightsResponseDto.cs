namespace srs.Server.Dtos.AI;

public class AiOwnerInsightsResponseDto
{
    public string ExecutiveSummary { get; set; } = string.Empty;
    public List<AiRestaurantDoctorItemDto> RestaurantDoctor { get; set; } = [];
    public string FinancialStory { get; set; } = string.Empty;
    public List<AiOwnerRiskItemDto> RiskBoard { get; set; } = [];
    public List<string> ActionPlan { get; set; } = [];
    public bool IsConfigured { get; set; }
    public string Model { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
