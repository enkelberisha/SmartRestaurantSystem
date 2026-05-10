using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Tenants;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Supabase;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace srs.Server.Services.Tenants;

public class TenantService(AppDbContext context, ISupabaseAdminService supabaseAdminService) : ITenantService
{
    private static readonly Regex StrongPasswordRegex = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$",
        RegexOptions.Compiled);

    public async Task<IReadOnlyList<TenantDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await context.Tenants
            .AsNoTracking()
            .OrderByDescending(tenant => tenant.CreatedAt)
            .Select(tenant => new TenantDto(
                tenant.Id,
                tenant.Name,
                tenant.IsActive,
                tenant.CreatedAt,
                tenant.Users.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<TenantDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.Id == id)
            .Select(tenant => new TenantDto(
                tenant.Id,
                tenant.Name,
                tenant.IsActive,
                tenant.CreatedAt,
                tenant.Users.Count))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TenantMemberDto>> GetMembersAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await context.Users
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId)
            .OrderBy(user => user.Email)
            .Select(user => new TenantMemberDto(
                user.Id,
                user.SupabaseUserId,
                user.Email,
                user.Role,
                user.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<TenantDto> CreateAsync(TenantRequestDto dto, CancellationToken cancellationToken = default)
    {
        var tenantName = dto.Name.Trim();
        var adminEmail = dto.AdminEmail.Trim().ToLowerInvariant();
        var adminPassword = dto.AdminPassword;
        var expectedAdminEmail = BuildTenantAdminEmail(tenantName);

        if (string.IsNullOrWhiteSpace(tenantName))
        {
            throw new InvalidOperationException("Tenant name is required.");
        }

        var normalizedTenantName = tenantName.ToLowerInvariant();
        var duplicateTenantExists = await context.Tenants.AnyAsync(
            tenant => tenant.Name.ToLower() == normalizedTenantName,
            cancellationToken);

        if (duplicateTenantExists)
        {
            throw new InvalidOperationException("A tenant with that name already exists.");
        }

        if (adminEmail != expectedAdminEmail)
        {
            throw new InvalidOperationException($"Admin email must follow the tenant pattern: {expectedAdminEmail}");
        }

        if (!StrongPasswordRegex.IsMatch(adminPassword))
        {
            throw new InvalidOperationException("Admin password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
        }

        if (await context.Users.AnyAsync(user => user.Email == adminEmail, cancellationToken))
        {
            throw new InvalidOperationException("A user with that admin email already exists.");
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = tenantName,
            IsActive = dto.IsActive
        };

        var created = await supabaseAdminService.CreateUserAsync(adminEmail, adminPassword, cancellationToken);

        try
        {
            var adminUser = new User
            {
                SupabaseUserId = created.Id,
                Email = created.Email,
                Role = UserRole.Admin,
                TenantId = tenant.Id,
                RestaurantId = null,
                IsActivated = true
            };

            context.Tenants.Add(tenant);
            context.Users.Add(adminUser);
            await context.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            try
            {
                await supabaseAdminService.DeleteUserAsync(created.Id, cancellationToken);
            }
            catch
            {
                // Preserve the original database error if cleanup fails.
            }

            throw;
        }

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.IsActive,
            tenant.CreatedAt,
            1);
    }

    private static string BuildTenantAdminEmail(string tenantName)
    {
        var slug = Regex.Replace(tenantName.ToLowerInvariant(), @"[^a-z0-9]+", "")
            .Trim();

        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "tenant";
        }

        return $"admin@{slug}.com";
    }

    public async Task<TenantDto?> UpdateAsync(Guid id, TenantRequestDto dto, CancellationToken cancellationToken = default)
    {
        var tenant = await context.Tenants
            .Include(current => current.Users)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (tenant is null)
        {
            return null;
        }

        var tenantName = dto.Name.Trim();
        var normalizedTenantName = tenantName.ToLowerInvariant();
        var duplicateTenantExists = await context.Tenants.AnyAsync(
            current => current.Id != id && current.Name.ToLower() == normalizedTenantName,
            cancellationToken);

        if (duplicateTenantExists)
        {
            throw new InvalidOperationException("A tenant with that name already exists.");
        }

        tenant.Name = tenantName;
        tenant.IsActive = dto.IsActive;

        await context.SaveChangesAsync(cancellationToken);

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.IsActive,
            tenant.CreatedAt,
            tenant.Users.Count);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenant = await context.Tenants
            .Include(current => current.Users)
            .Include(current => current.Restaurants)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (tenant is null)
        {
            return false;
        }

        var users = tenant.Users.ToList();
        var restaurants = tenant.Restaurants.ToList();
        var deletedAt = DateTime.UtcNow;

        foreach (var user in users)
        {
            await supabaseAdminService.DeleteUserAsync(user.SupabaseUserId, cancellationToken);
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        await context.AuditLogs
            .Where(log => log.TenantId == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(log => log.TenantId, (Guid?)null), cancellationToken);

        context.AuditLogs.AddRange(BuildTenantDeletionAuditLogs(tenant, users, restaurants, deletedAt));
        await context.SaveChangesAsync(cancellationToken);

        await context.Set<RestaurantApprovalRequest>()
            .Where(request => request.TenantId == id)
            .ExecuteDeleteAsync(cancellationToken);

        await context.Users
            .Where(user => user.TenantId == id)
            .ExecuteDeleteAsync(cancellationToken);

        await context.Restaurants
            .Where(restaurant => restaurant.TenantId == id)
            .ExecuteDeleteAsync(cancellationToken);

        await context.Tenants
            .Where(current => current.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static IEnumerable<AuditLog> BuildTenantDeletionAuditLogs(
        Tenant tenant,
        IReadOnlyCollection<User> users,
        IReadOnlyCollection<Restaurant> restaurants,
        DateTime deletedAt)
    {
        foreach (var user in users)
        {
            yield return new AuditLog
            {
                TenantId = null,
                Action = "Delete",
                TableName = "users",
                RecordId = user.Id,
                Target = $"users:{user.Id}",
                Detail = JsonSerializer.Serialize(new
                {
                    user.Id,
                    user.SupabaseUserId,
                    user.Email,
                    user.Role,
                    user.IsActivated,
                    user.TenantId,
                    user.RestaurantId,
                    DeletedBecause = $"Tenant {tenant.Name} was deleted."
                }),
                CreatedAt = deletedAt
            };
        }

        foreach (var restaurant in restaurants)
        {
            yield return new AuditLog
            {
                TenantId = null,
                Action = "Delete",
                TableName = "restaurants",
                RecordId = restaurant.Id,
                Target = $"restaurants:{restaurant.Id}",
                Detail = JsonSerializer.Serialize(new
                {
                    restaurant.Id,
                    restaurant.TenantId,
                    restaurant.Name,
                    restaurant.Location,
                    restaurant.CuisineType,
                    restaurant.ContactEmail,
                    restaurant.ContactPhone,
                    restaurant.OwnerId,
                    restaurant.ManagerId,
                    DeletedBecause = $"Tenant {tenant.Name} was deleted."
                }),
                CreatedAt = deletedAt
            };
        }

        yield return new AuditLog
        {
            TenantId = null,
            Action = "Delete",
            TableName = "tenants",
            RecordId = 0,
            Target = $"tenants:{tenant.Id}",
            Detail = JsonSerializer.Serialize(new
            {
                tenant.Id,
                tenant.Name,
                tenant.IsActive,
                tenant.CreatedAt,
                UserCount = users.Count,
                RestaurantCount = restaurants.Count
            }),
            CreatedAt = deletedAt
        };
    }
}
