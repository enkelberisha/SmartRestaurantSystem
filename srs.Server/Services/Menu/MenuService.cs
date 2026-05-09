using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Menu;
using srs.Server.Models;

namespace srs.Server.Services.Menu;

public class MenuService : IMenuService
{
    private readonly AppDbContext _context;

    public MenuService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<MenuDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.MenuOfRestaurants
            .Where(m => _context.Restaurants
                .Any(r => r.Id == m.RestaurantId && r.TenantId == tenantId))
            .Select(m => new MenuDto
            {
                Id = m.Id,
                RestaurantId = m.RestaurantId,
                Name = m.Name
            })
            .ToListAsync();
    }

    public async Task<List<MenuDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await _context.MenuOfRestaurants
            .Where(m => m.RestaurantId == restaurantId &&
                _context.Restaurants.Any(r => r.Id == restaurantId && r.TenantId == tenantId))
            .Select(m => new MenuDto
            {
                Id = m.Id,
                RestaurantId = m.RestaurantId,
                Name = m.Name
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<MenuDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.MenuOfRestaurants
            .Where(m => m.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == m.RestaurantId &&
                    r.TenantId == tenantId))
            .OrderBy(m => m.Id)
            .Select(m => new MenuDto
            {
                Id = m.Id,
                RestaurantId = m.RestaurantId,
                Name = m.Name
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MenuDto> CreateAsync(MenuRequestDto dto, Guid tenantId)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId);

        if (!restaurantExists)
            throw new Exception("Restaurant not found or not in tenant");

        var menu = new MenuOfRestaurant
        {
            RestaurantId = dto.RestaurantId,
            Name = dto.Name
        };

        _context.MenuOfRestaurants.Add(menu);
        await _context.SaveChangesAsync();

        return new MenuDto
        {
            Id = menu.Id,
            RestaurantId = menu.RestaurantId,
            Name = menu.Name
        };
    }

    public async Task<bool> UpdateAsync(int id, MenuRequestDto dto, Guid tenantId)
    {
        var menu = await _context.MenuOfRestaurants
            .FirstOrDefaultAsync(m => m.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == m.RestaurantId &&
                    r.TenantId == tenantId));

        if (menu == null)
            return false;

        menu.Name = dto.Name;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var menu = await _context.MenuOfRestaurants
            .FirstOrDefaultAsync(m => m.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == m.RestaurantId &&
                    r.TenantId == tenantId));

        if (menu == null)
            return false;

        _context.MenuOfRestaurants.Remove(menu);
        await _context.SaveChangesAsync();

        return true;
    }
}

