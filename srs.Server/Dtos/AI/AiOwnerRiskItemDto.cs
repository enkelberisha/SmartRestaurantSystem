namespace srs.Server.Dtos.AI;

public class AiOwnerRiskItemDto
{
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = "normal";
    public string Insight { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}
