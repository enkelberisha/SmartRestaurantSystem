namespace srs.Server.Dtos.AI;

public class AiOwnerInsightsJobDto
{
    public Guid JobId { get; set; }
    public string Status { get; set; } = "queued";
    public int? RestaurantId { get; set; }
    public AiOwnerInsightsResponseDto? Result { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
