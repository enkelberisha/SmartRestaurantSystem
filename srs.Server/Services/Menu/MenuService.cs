using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Menu;
using srs.Server.Models;
using srs.Server.Services.Caching;

namespace srs.Server.Services.Menu;

public class MenuService : IMenuService
{
    private readonly AppDbContext _context;
    private readonly IAppCache _cache;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public MenuService(AppDbContext context, IAppCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<List<MenuDto>> GetAllAsync(Guid tenantId)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:all:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.MenuOfRestaurants
                .Where(menu => _context.Restaurants
                    .Any(restaurant => restaurant.Id == menu.RestaurantId && restaurant.TenantId == tenantId))
                .OrderBy(menu => menu.Name)
                .ThenBy(menu => menu.Id)
                .Select(MapMenu())
                .ToListAsync(ct),
            CacheTtl);
    }

    public async Task<List<MenuDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var scope = BuildRestaurantScope(restaurantId);
        var version = await _cache.GetVersionAsync(scope, cancellationToken);
        var key = $"{scope}:tenant:{tenantId:N}:all:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.MenuOfRestaurants
                .Where(menu => menu.RestaurantId == restaurantId &&
                    _context.Restaurants.Any(restaurant => restaurant.Id == restaurantId && restaurant.TenantId == tenantId))
                .OrderBy(menu => menu.Name)
                .ThenBy(menu => menu.Id)
                .Select(MapMenu())
                .ToListAsync(ct),
            CacheTtl,
            cancellationToken);
    }

    public async Task<MenuDto?> GetByIdAsync(int id, Guid tenantId)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:by-id:{id}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.MenuOfRestaurants
                .Where(menu => menu.Id == id &&
                    _context.Restaurants.Any(restaurant =>
                        restaurant.Id == menu.RestaurantId &&
                        restaurant.TenantId == tenantId))
                .OrderBy(menu => menu.Id)
                .Select(MapMenu())
                .FirstOrDefaultAsync(ct),
            CacheTtl);
    }

    public async Task<MenuDto> CreateAsync(MenuRequestDto dto, Guid tenantId)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(restaurant => restaurant.Id == dto.RestaurantId && restaurant.TenantId == tenantId);

        if (!restaurantExists)
            throw new Exception("Restaurant not found or not in tenant");

        var menu = new MenuOfRestaurant
        {
            RestaurantId = dto.RestaurantId,
            Name = dto.Name
        };

        _context.MenuOfRestaurants.Add(menu);
        await _context.SaveChangesAsync();
        await RefreshMenuCachesAsync(tenantId, dto.RestaurantId);

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
            .FirstOrDefaultAsync(current => current.Id == id &&
                _context.Restaurants.Any(restaurant =>
                    restaurant.Id == current.RestaurantId &&
                    restaurant.TenantId == tenantId));

        if (menu == null)
            return false;

        menu.Name = dto.Name;

        await _context.SaveChangesAsync();
        await RefreshMenuCachesAsync(tenantId, menu.RestaurantId);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var menu = await _context.MenuOfRestaurants
            .FirstOrDefaultAsync(current => current.Id == id &&
                _context.Restaurants.Any(restaurant =>
                    restaurant.Id == current.RestaurantId &&
                    restaurant.TenantId == tenantId));

        if (menu == null)
            return false;

        var restaurantId = menu.RestaurantId;
        _context.MenuOfRestaurants.Remove(menu);
        await _context.SaveChangesAsync();
        await RefreshMenuCachesAsync(tenantId, restaurantId);

        return true;
    }

    private async Task RefreshMenuCachesAsync(Guid tenantId, int restaurantId, CancellationToken cancellationToken = default)
    {
        await _cache.RefreshVersionAsync(BuildTenantScope(tenantId), cancellationToken);
        await _cache.RefreshVersionAsync(BuildRestaurantScope(restaurantId), cancellationToken);
    }

    private static string BuildTenantScope(Guid tenantId) => $"menus:tenant:{tenantId:N}";

    private static string BuildRestaurantScope(int restaurantId) => $"menus:restaurant:{restaurantId}";

    private static System.Linq.Expressions.Expression<Func<MenuOfRestaurant, MenuDto>> MapMenu()
    {
        return menu => new MenuDto
        {
            Id = menu.Id,
            RestaurantId = menu.RestaurantId,
            Name = menu.Name
        };
    }
}
