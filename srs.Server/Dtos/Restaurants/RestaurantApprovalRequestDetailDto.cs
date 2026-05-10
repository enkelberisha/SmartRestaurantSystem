using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Restaurants;

public class RestaurantApprovalRequestDetailDto
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public int RequestedByUserId { get; set; }
    public string RequestedByEmail { get; set; } = string.Empty;
    public int? RestaurantId { get; set; }
    public RestaurantApprovalRequestType Type { get; set; }
    public RestaurantApprovalRequestStatus Status { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public RestaurantRequestDto? Restaurant { get; set; }
    public List<RestaurantAccountRequestDto> Accounts { get; set; } = [];
}
