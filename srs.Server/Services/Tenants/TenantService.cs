using srs.Server.Data;
using srs.Server.Dtos.Tenants;
using srs.Server.Models;

namespace srs.Server.Services.Tenants
{
    public class TenantService : ITenantService
    {
        private readonly AppDbContext _context;

        public TenantService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TenantResponseDto> CreateAsync(CreateTenantDto dto)
        {
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return Map(tenant);
        }

        public async Task<List<TenantResponseDto>> GetAllAsync()
        {
            return await _context.Tenants
                .Select(t => Map(t))
                .ToListAsync();
        }

        public async Task<TenantResponseDto?> GetByIdAsync(Guid id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            return tenant == null ? null : Map(tenant);
        }

        public async Task<bool> UpdateAsync(Guid id, UpdateTenantDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return false;

            tenant.Name = dto.Name;
            tenant.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        private static TenantResponseDto Map(Tenant t) => new()
        {
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt
        };
    }
}
