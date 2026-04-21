namespace srs.Server.Models;

public class AuditLog
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public string TableName { get; set; } = null!;

    public int RecordId { get; set; }

    public string DeletedData { get; set; } = null!;

    public DateTime? DeletedAt { get; set; }

    public Tenant? Tenant { get; set; }
}