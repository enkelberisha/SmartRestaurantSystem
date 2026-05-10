namespace srs.Server.Models;

public class AuditLog
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public int? ActorUserId { get; set; }

    public string? ActorEmail { get; set; }

    public string? ActorRole { get; set; }

    public string Action { get; set; } = null!;

    public string TableName { get; set; } = null!;

    public int RecordId { get; set; }

    public string Target { get; set; } = null!;

    public string Detail { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}
