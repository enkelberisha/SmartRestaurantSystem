using srs.Server.Dtos.AuditLogs;

namespace srs.Server.Services.AuditLogs
{
    public interface IAuditLogService
    {
        Task<List<AuditLogResponseDto>> GetAllAsync(Guid? tenantId, CancellationToken cancellationToken);
    }
}
