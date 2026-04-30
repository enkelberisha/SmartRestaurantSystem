namespace srs.Server.Dtos.AuditLogs;

public class AuditLogResponseDto
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public string TableName { get; set; } = string.Empty;

    public int RecordId { get; set; }

    public string DeletedData { get; set; } = string.Empty;

    public DateTime? DeletedAt { get; set; }
}
