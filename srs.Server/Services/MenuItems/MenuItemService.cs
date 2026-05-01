using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.MenuItems;
using srs.Server.Models;

namespace srs.Server.Services.MenuItems;

public class MenuItemService : IMenuItemService
{
    private readonly AppDbContext _context;

    public MenuItemService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<MenuItemDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.MenuItems
            .Where(mi =>
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)))
            .Select(mi => new MenuItemDto
            {
                Id = mi.Id,
                MenuId = mi.MenuId,
                Name = mi.Name,
                Price = mi.Price,
                Description = mi.Description,
                CookingTime = mi.CookingTime
            })
            .ToListAsync();
    }

    public async Task<MenuItemDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.MenuItems
            .Where(mi => mi.Id == id &&
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)))
            .Select(mi => new MenuItemDto
            {
                Id = mi.Id,
                MenuId = mi.MenuId,
                Name = mi.Name,
                Price = mi.Price,
                Description = mi.Description,
                CookingTime = mi.CookingTime
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MenuItemDto> CreateAsync(MenuItemRequestDto dto, Guid tenantId)
    {
        // 🔥 VALIDATION
        var menuExists = await _context.MenuOfRestaurants
            .AnyAsync(m =>
                m.Id == dto.MenuId &&
                _context.Restaurants.Any(r =>
                    r.Id == m.RestaurantId &&
                    r.TenantId == tenantId));

        if (!menuExists)
            throw new Exception("Menu not found or not in tenant");

        var item = new MenuItem
        {
            MenuId = dto.MenuId,
            Name = dto.Name,
            Price = dto.Price,
            Description = dto.Description,
            CookingTime = dto.CookingTime
        };

        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();

        return new MenuItemDto
        {
            Id = item.Id,
            MenuId = item.MenuId,
            Name = item.Name,
            Price = item.Price,
            Description = item.Description,
            CookingTime = item.CookingTime
        };
    }

    public async Task<bool> UpdateAsync(int id, MenuItemRequestDto dto, Guid tenantId)
    {
        var item = await _context.MenuItems
            .FirstOrDefaultAsync(mi => mi.Id == id &&
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)));

        if (item == null)
            return false;

        item.Name = dto.Name;
        item.Price = dto.Price;
        item.Description = dto.Description;
        item.CookingTime = dto.CookingTime;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var item = await _context.MenuItems
            .FirstOrDefaultAsync(mi => mi.Id == id &&
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)));

        if (item == null)
            return false;

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();

        return true;
    }
}