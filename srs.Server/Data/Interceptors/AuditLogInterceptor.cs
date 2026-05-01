using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using srs.Server.Models;

namespace srs.Server.Data.Interceptors;

public class AuditLogInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null)
        {
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        var auditLogs = context.ChangeTracker
            .Entries()
            .Where(entry => entry.State == EntityState.Deleted && entry.Entity is not AuditLog)
            .Select(entry => CreateAuditLog(context, entry))
            .ToList();

        if (auditLogs.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditLogs);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static AuditLog CreateAuditLog(DbContext context, EntityEntry entry)
    {
        var entityType = entry.Metadata;
        var tableName = entityType.GetTableName() ?? entityType.ClrType.Name;
        var deletedData = entry.Properties.ToDictionary(
            property => property.Metadata.Name,
            property => property.CurrentValue);

        return new AuditLog
        {
            TableName = tableName,
            RecordId = GetIntProperty(entry, "Id"),
            TenantId = GetGuidProperty(entry, "TenantId"),
            DeletedData = JsonSerializer.Serialize(deletedData),
            DeletedAt = DateTime.UtcNow
        };
    }

    private static int GetIntProperty(EntityEntry entry, string propertyName)
    {
        var property = entry.Properties.FirstOrDefault(current => current.Metadata.Name == propertyName);
        if (property?.CurrentValue is null)
        {
            return 0;
        }

        return Convert.ToInt32(property.CurrentValue);
    }

    private static Guid? GetGuidProperty(EntityEntry entry, string propertyName)
    {
        var property = entry.Properties.FirstOrDefault(current => current.Metadata.Name == propertyName);
        return property?.CurrentValue as Guid?;
    }
}
