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

    public async Task<List<MenuItemDto>> GetAllAsync(Guid tenantId, MenuItemQueryDto? query = null)
    {
        var menuItems = _context.MenuItems
            .Include(mi => mi.FilterAssignments)
                .ThenInclude(assignment => assignment.MenuItemFilter)
            .Where(mi =>
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)));

        menuItems = ApplyQuery(menuItems, query);

        return await menuItems
            .Select(mi => new MenuItemDto
            {
                Id = mi.Id,
                MenuId = mi.MenuId,
                Name = mi.Name,
                Price = mi.Price,
                Description = mi.Description,
                CookingTime = mi.CookingTime,
                Filters = mi.FilterAssignments
                    .Where(assignment => assignment.MenuItemFilter.IsActive)
                    .OrderBy(assignment => assignment.MenuItemFilter.SortOrder)
                    .Select(assignment => assignment.MenuItemFilter.Slug)
                    .ToList()
            })
            .ToListAsync();
    }

    public async Task<List<MenuItemDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        MenuItemQueryDto? query = null,
        CancellationToken cancellationToken = default)
    {
        var menuItems = _context.MenuItems
            .Include(mi => mi.FilterAssignments)
                .ThenInclude(assignment => assignment.MenuItemFilter)
            .Where(mi =>
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    m.RestaurantId == restaurantId &&
                    _context.Restaurants.Any(r =>
                        r.Id == restaurantId &&
                        r.TenantId == tenantId)));

        menuItems = ApplyQuery(menuItems, query);

        return await menuItems
            .Select(mi => new MenuItemDto
            {
                Id = mi.Id,
                MenuId = mi.MenuId,
                Name = mi.Name,
                Price = mi.Price,
                Description = mi.Description,
                CookingTime = mi.CookingTime,
                Filters = mi.FilterAssignments
                    .Where(assignment => assignment.MenuItemFilter.IsActive)
                    .OrderBy(assignment => assignment.MenuItemFilter.SortOrder)
                    .Select(assignment => assignment.MenuItemFilter.Slug)
                    .ToList()
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<MenuItemFilterDto>> GetFiltersAsync(
        Guid tenantId,
        int? restaurantId = null,
        CancellationToken cancellationToken = default)
    {
        var filters = _context.MenuItemFilters
            .Where(filter => filter.TenantId == tenantId && filter.IsActive);

        return await filters
            .OrderBy(filter => filter.SortOrder)
            .ThenBy(filter => filter.Name)
            .Select(filter => new MenuItemFilterDto
            {
                Id = filter.Id,
                Name = filter.Name,
                Slug = filter.Slug,
                SortOrder = filter.SortOrder
            })
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<MenuItem> ApplyQuery(IQueryable<MenuItem> menuItems, MenuItemQueryDto? query)
    {
        var search = query?.Search?.Trim();

        if (string.IsNullOrWhiteSpace(search))
        {
            return ApplyFilterQuery(menuItems, query);
        }

        var pattern = $"%{search}%";

        menuItems = menuItems.Where(mi =>
            EF.Functions.ILike(mi.Name, pattern) ||
            (mi.Description != null && EF.Functions.ILike(mi.Description, pattern)));

        return ApplyFilterQuery(menuItems, query);
    }

    private static IQueryable<MenuItem> ApplyFilterQuery(IQueryable<MenuItem> menuItems, MenuItemQueryDto? query)
    {
        var filters = query?.Filters
            .Select(filter => filter.Trim())
            .Where(filter => !string.IsNullOrWhiteSpace(filter))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (filters is null || filters.Length == 0)
        {
            return menuItems;
        }

        foreach (var filter in filters)
        {
            var activeFilter = filter;
            menuItems = menuItems.Where(mi =>
                mi.FilterAssignments.Any(assignment =>
                    assignment.MenuItemFilter.IsActive &&
                    assignment.MenuItemFilter.Slug == activeFilter));
        }

        return menuItems;
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
                CookingTime = mi.CookingTime,
                Filters = mi.FilterAssignments
                    .Where(assignment => assignment.MenuItemFilter.IsActive)
                    .OrderBy(assignment => assignment.MenuItemFilter.SortOrder)
                    .Select(assignment => assignment.MenuItemFilter.Slug)
                    .ToList()
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

