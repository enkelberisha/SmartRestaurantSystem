namespace srs.Server.Dtos.AuditLogs;

public class AuditLogResponseDto
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public int? ActorUserId { get; set; }

    public string? ActorEmail { get; set; }

    public string? ActorRole { get; set; }

    public string Action { get; set; } = string.Empty;

    public string TableName { get; set; } = string.Empty;

    public int RecordId { get; set; }

    public string Target { get; set; } = string.Empty;

    public string Detail { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
