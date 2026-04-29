using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Tenants;
using srs.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace srs.Server.Services.Tenants;

public class TenantService(AppDbContext context) : ITenantService
namespace srs.Server.Services.Tenants
{
    public async Task<IReadOnlyList<TenantDto>> GetAllAsync(CancellationToken cancellationToken = default)
    public class TenantService : ITenantService
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
        private readonly AppDbContext _context;

    public async Task<TenantDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        public TenantService(AppDbContext context)
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
            _context = context;
    }

    public async Task<IReadOnlyList<TenantMemberDto>> GetMembersAsync(Guid tenantId, CancellationToken cancellationToken = default)
        public async Task<TenantResponseDto> CreateAsync(CreateTenantDto dto)
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
                Name = dto.Name,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
        };

        context.Tenants.Add(tenant);
        await context.SaveChangesAsync(cancellationToken);
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

        return new TenantDto(tenant.Id, tenant.Name, tenant.IsActive, tenant.CreatedAt, 0);
            return Map(tenant);
    }

    public async Task<TenantDto?> UpdateAsync(Guid id, TenantRequestDto dto, CancellationToken cancellationToken = default)
        public async Task<List<TenantResponseDto>> GetAllAsync()
    {
        var tenant = await context.Tenants
            .Include(current => current.Users)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);
            return await _context.Tenants
                .Select(t => Map(t))
                .ToListAsync();
        }

        if (tenant is null)
        public async Task<TenantResponseDto?> GetByIdAsync(Guid id)
        {
            return null;
            var tenant = await _context.Tenants.FindAsync(id);
            return tenant == null ? null : Map(tenant);
        }

        tenant.Name = dto.Name.Trim();
        public async Task<bool> UpdateAsync(Guid id, UpdateTenantDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return false;

            tenant.Name = dto.Name;
        tenant.IsActive = dto.IsActive;

        await context.SaveChangesAsync(cancellationToken);

        return new TenantDto(tenant.Id, tenant.Name, tenant.IsActive, tenant.CreatedAt, tenant.Users.Count);
            await _context.SaveChangesAsync();
            return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenant = await context.Tenants.FirstOrDefaultAsync(current => current.Id == id, cancellationToken);
        if (tenant is null)
        private static TenantResponseDto Map(Tenant t) => new()
        {
            return false;
        }

        context.Tenants.Remove(tenant);
        await context.SaveChangesAsync(cancellationToken);
        return true;
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt
        };
    }
}
