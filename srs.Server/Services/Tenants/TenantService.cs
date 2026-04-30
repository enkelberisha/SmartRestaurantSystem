using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Tenants;
using srs.Server.Models;

namespace srs.Server.Services.Tenants;

public class TenantService(AppDbContext context) : ITenantService
{
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
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            IsActive = dto.IsActive
        };

        context.Tenants.Add(tenant);
        await context.SaveChangesAsync(cancellationToken);

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.IsActive,
            tenant.CreatedAt,
            0);
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

        tenant.Name = dto.Name.Trim();
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
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (tenant is null)
        {
            return false;
        }

        context.Tenants.Remove(tenant);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
