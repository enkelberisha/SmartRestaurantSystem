namespace srs.Server.Services.AuditLogs
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Dtos.AuditLogs;

    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;

        public AuditLogService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<AuditLogResponseDto>> GetAllAsync(Guid? tenantId, CancellationToken cancellationToken)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AuditLogResponseDto
                {
                    Id = a.Id,
                    ActorUserId = a.ActorUserId,
                    ActorEmail = a.ActorEmail,
                    ActorRole = a.ActorRole,
                    Action = a.Action,
                    TableName = a.TableName,
                    RecordId = a.RecordId,
                    Target = a.Target,
                    Detail = a.Detail,
                    CreatedAt = a.CreatedAt,
                    TenantId = a.TenantId
                })
                .ToListAsync(cancellationToken);
        }
    }

}
