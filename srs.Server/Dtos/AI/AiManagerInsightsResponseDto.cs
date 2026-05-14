namespace srs.Server.Dtos.AI;

public class AiManagerInsightsResponseDto
{
    public string SmartSummary { get; set; } = string.Empty;
    public List<AiMenuDoctorItemDto> MenuDoctor { get; set; } = [];
    public List<AiRestockInsightDto> RestockIntelligence { get; set; } = [];
    public string RevenueStory { get; set; } = string.Empty;
    public List<string> ActionItems { get; set; } = [];
    public bool IsConfigured { get; set; }
    public string Model { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
