using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class RestaurantApprovalRequest
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public int RequestedByUserId { get; set; }

    public int? RestaurantId { get; set; }

    public RestaurantApprovalRequestType Type { get; set; }

    public RestaurantApprovalRequestStatus Status { get; set; } = RestaurantApprovalRequestStatus.Pending;

    public string Summary { get; set; } = string.Empty;

    public string ProtectedPayload { get; set; } = string.Empty;

    public string? AdminPasswordConfirmation { get; set; }

    public string? RejectionReason { get; set; }

    public int? ReviewedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;

    public User RequestedByUser { get; set; } = null!;

    public User? ReviewedByUser { get; set; }

    public Restaurant? Restaurant { get; set; }
}
