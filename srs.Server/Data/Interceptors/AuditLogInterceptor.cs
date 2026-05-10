using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using srs.Server.Models;

namespace srs.Server.Data.Interceptors;

public class AuditLogInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    private readonly ConcurrentDictionary<DbContext, List<PendingAuditEntry>> _pendingAudits = new();
    private readonly ConcurrentDictionary<DbContext, byte> _suppressedContexts = new();

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null || _suppressedContexts.ContainsKey(context))
        {
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        var actor = ResolveActor(httpContextAccessor.HttpContext?.User);
        var pendingEntries = context.ChangeTracker
            .Entries()
            .Where(entry => entry.Entity is not AuditLog)
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Select(entry => CreatePendingAuditEntry(entry, actor))
            .Where(entry => entry is not null)
            .Cast<PendingAuditEntry>()
            .ToList();

        if (pendingEntries.Count > 0)
        {
            _pendingAudits[context] = pendingEntries;
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null || _suppressedContexts.ContainsKey(context))
        {
            return await base.SavedChangesAsync(eventData, result, cancellationToken);
        }

        if (!_pendingAudits.TryRemove(context, out var pendingEntries) || pendingEntries.Count == 0)
        {
            return await base.SavedChangesAsync(eventData, result, cancellationToken);
        }

        var auditLogs = pendingEntries
            .Select(CreateAuditLog)
            .Where(log => log is not null)
            .Cast<AuditLog>()
            .ToList();

        if (auditLogs.Count > 0)
        {
            _suppressedContexts.TryAdd(context, 0);

            try
            {
                context.Set<AuditLog>().AddRange(auditLogs);
                await context.SaveChangesAsync(cancellationToken);
            }
            finally
            {
                _suppressedContexts.TryRemove(context, out _);
            }
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
        {
            _pendingAudits.TryRemove(eventData.Context, out _);
            _suppressedContexts.TryRemove(eventData.Context, out _);
        }

        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private static PendingAuditEntry? CreatePendingAuditEntry(EntityEntry entry, AuditActor actor)
    {
        var changedProperties = entry.Properties
            .Where(property => property.Metadata.Name != nameof(AuditLog.Id))
            .Where(property => entry.State != EntityState.Modified || property.IsModified)
            .ToList();

        if (entry.State == EntityState.Modified && changedProperties.Count == 0)
        {
            return null;
        }

        var tableName = entry.Metadata.GetTableName() ?? entry.Metadata.ClrType.Name;
        var recordId = ResolveRecordId(entry);
        var tenantId = ResolveTenantId(entry, actor.TenantId);
        var action = entry.State switch
        {
            EntityState.Added => "Create",
            EntityState.Modified => "Update",
            EntityState.Deleted => "Delete",
            _ => "Unknown"
        };

        object detailPayload;

        if (entry.State == EntityState.Added)
        {
            detailPayload = new
            {
                NewValues = changedProperties.ToDictionary(
                    property => property.Metadata.Name,
                    property => property.CurrentValue)
            };
        }
        else if (entry.State == EntityState.Modified)
        {
            detailPayload = new
            {
                OldValues = changedProperties.ToDictionary(
                    property => property.Metadata.Name,
                    property => property.OriginalValue),
                NewValues = changedProperties.ToDictionary(
                    property => property.Metadata.Name,
                    property => property.CurrentValue)
            };
        }
        else
        {
            detailPayload = new
            {
                OldValues = changedProperties.ToDictionary(
                    property => property.Metadata.Name,
                    property => property.OriginalValue)
            };
        }

        return new PendingAuditEntry
        {
            TableName = tableName,
            RecordId = recordId,
            TenantId = tenantId,
            ActorUserId = actor.UserId,
            ActorEmail = actor.Email,
            ActorRole = actor.Role,
            Action = action,
            Target = recordId > 0 ? $"{tableName}:{recordId}" : tableName,
            Detail = JsonSerializer.Serialize(detailPayload)
        };
    }

    private static AuditLog CreateAuditLog(PendingAuditEntry entry)
    {
        return new AuditLog
        {
            TenantId = entry.TenantId,
            ActorUserId = entry.ActorUserId,
            ActorEmail = entry.ActorEmail,
            ActorRole = entry.ActorRole,
            Action = entry.Action,
            TableName = entry.TableName,
            RecordId = entry.RecordId,
            Target = entry.Target,
            Detail = entry.Detail,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static int ResolveRecordId(EntityEntry entry)
    {
        var property = entry.Properties.FirstOrDefault(current => current.Metadata.Name == "Id");
        if (property?.CurrentValue is null)
        {
            return property?.OriginalValue is null ? 0 : Convert.ToInt32(property.OriginalValue);
        }

        return Convert.ToInt32(property.CurrentValue);
    }

    private static Guid? ResolveTenantId(EntityEntry entry, Guid? fallbackTenantId)
    {
        var property = entry.Properties.FirstOrDefault(current => current.Metadata.Name == "TenantId");

        if (property?.CurrentValue is Guid currentTenantId)
        {
            return currentTenantId;
        }

        if (property?.OriginalValue is Guid originalTenantId)
        {
            return originalTenantId;
        }

        return fallbackTenantId;
    }

    private static AuditActor ResolveActor(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return new AuditActor(null, null, null, null);
        }

        int? userId = null;
        var userIdClaim = principal.FindFirstValue("app_user_id");
        if (int.TryParse(userIdClaim, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        Guid? tenantId = null;
        var tenantIdClaim = principal.FindFirstValue("tenant_id");
        if (Guid.TryParse(tenantIdClaim, out var parsedTenantId))
        {
            tenantId = parsedTenantId;
        }

        return new AuditActor(
            userId,
            principal.FindFirstValue("email") ?? principal.FindFirstValue(ClaimTypes.Email),
            principal.FindFirstValue(ClaimTypes.Role),
            tenantId);
    }

    private sealed record AuditActor(int? UserId, string? Email, string? Role, Guid? TenantId);

    private sealed class PendingAuditEntry
    {
        public Guid? TenantId { get; init; }
        public int? ActorUserId { get; init; }
        public string? ActorEmail { get; init; }
        public string? ActorRole { get; init; }
        public string Action { get; init; } = string.Empty;
        public string TableName { get; init; } = string.Empty;
        public int RecordId { get; init; }
        public string Target { get; init; } = string.Empty;
        public string Detail { get; init; } = string.Empty;
    }
}
