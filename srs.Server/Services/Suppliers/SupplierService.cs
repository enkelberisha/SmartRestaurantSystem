using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Suppliers;
using srs.Server.Models;

namespace srs.Server.Services.Suppliers;

public class SupplierService : ISupplierService
{
    private readonly AppDbContext _context;

    public SupplierService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.Suppliers
            .Where(s =>
                _context.Restaurants.Any(r =>
                    r.Id == s.RestaurantId &&
                    r.TenantId == tenantId))
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                RestaurantId = s.RestaurantId,
                Name = s.Name,
                Contact = s.Contact
            })
            .ToListAsync();
    }

    public async Task<SupplierDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.Suppliers
            .Where(s => s.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == s.RestaurantId &&
                    r.TenantId == tenantId))
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                RestaurantId = s.RestaurantId,
                Name = s.Name,
                Contact = s.Contact
            })
            .FirstOrDefaultAsync();
    }

    public async Task<SupplierDto> CreateAsync(SupplierRequestDto dto, Guid tenantId)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId);

        if (!restaurantExists)
            throw new Exception("Restaurant not found or not in tenant");

        var supplier = new Supplier
        {
            RestaurantId = dto.RestaurantId,
            Name = dto.Name,
            Contact = dto.Contact
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return new SupplierDto
        {
            Id = supplier.Id,
            RestaurantId = supplier.RestaurantId,
            Name = supplier.Name,
            Contact = supplier.Contact
        };
    }

    public async Task<bool> UpdateAsync(int id, SupplierRequestDto dto, Guid tenantId)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == s.RestaurantId &&
                    r.TenantId == tenantId));

        if (supplier == null)
            return false;

        supplier.Name = dto.Name;
        supplier.Contact = dto.Contact;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == s.RestaurantId &&
                    r.TenantId == tenantId));

        if (supplier == null)
            return false;

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();

        return true;
    }
}