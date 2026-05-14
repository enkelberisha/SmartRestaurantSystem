using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using srs.Server.Data;
using srs.Server.Dtos.MenuItems;
using srs.Server.Models;
using srs.Server.Services.Caching;
using srs.Server.Services.Cloudinary;

namespace srs.Server.Services.MenuItems;

public class MenuItemService : IMenuItemService
{
    private readonly AppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IAppCache _cache;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan FilterCacheTtl = TimeSpan.FromMinutes(3);

    public MenuItemService(AppDbContext context, ICloudinaryService cloudinaryService, IAppCache cache)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _cache = cache;
    }

    public async Task<List<MenuItemDto>> GetAllAsync(Guid tenantId, MenuItemQueryDto? query = null)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:all:{BuildQueryKey(query)}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            async ct =>
            {
                var menuItems = _context.MenuItems
                    .Include(menuItem => menuItem.FilterAssignments)
                        .ThenInclude(assignment => assignment.MenuItemFilter)
                    .Where(menuItem =>
                        _context.MenuOfRestaurants.Any(menu =>
                            menu.Id == menuItem.MenuId &&
                            _context.Restaurants.Any(restaurant =>
                                restaurant.Id == menu.RestaurantId &&
                                restaurant.TenantId == tenantId)));

                menuItems = ApplyQuery(menuItems, query);

                return await menuItems
                    .OrderBy(menuItem => menuItem.Name)
                    .ThenBy(menuItem => menuItem.Id)
                    .Select(MapMenuItem())
                    .ToListAsync(ct);
            },
            CacheTtl);
    }

    public async Task<List<MenuItemDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        MenuItemQueryDto? query = null,
        CancellationToken cancellationToken = default)
    {
        var scope = BuildRestaurantScope(restaurantId);
        var version = await _cache.GetVersionAsync(scope, cancellationToken);
        var key = $"{scope}:tenant:{tenantId:N}:items:{BuildQueryKey(query)}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            async ct =>
            {
                var menuItems = _context.MenuItems
                    .Include(menuItem => menuItem.FilterAssignments)
                        .ThenInclude(assignment => assignment.MenuItemFilter)
                    .Where(menuItem =>
                        _context.MenuOfRestaurants.Any(menu =>
                            menu.Id == menuItem.MenuId &&
                            menu.RestaurantId == restaurantId &&
                            _context.Restaurants.Any(restaurant =>
                                restaurant.Id == restaurantId &&
                                restaurant.TenantId == tenantId)));

                menuItems = ApplyQuery(menuItems, query);

                return await menuItems
                    .OrderBy(menuItem => menuItem.Name)
                    .ThenBy(menuItem => menuItem.Id)
                    .Select(MapMenuItem())
                    .ToListAsync(ct);
            },
            CacheTtl,
            cancellationToken);
    }

    public async Task<List<MenuItemFilterDto>> GetFiltersAsync(
        Guid tenantId,
        int? restaurantId = null,
        CancellationToken cancellationToken = default)
    {
        var scope = restaurantId.HasValue
            ? BuildRestaurantFilterScope(restaurantId.Value)
            : BuildTenantFilterScope(tenantId);
        var version = await _cache.GetVersionAsync(scope, cancellationToken);
        var key = $"{scope}:tenant:{tenantId:N}:filters:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            async ct =>
            {
                var filters = _context.MenuItemFilters
                    .Where(filter => filter.TenantId == tenantId && filter.IsActive);

                if (restaurantId.HasValue)
                {
                    filters = filters.Where(filter =>
                        filter.RestaurantId == null ||
                        filter.RestaurantId == restaurantId.Value);
                }

                return await filters
                    .OrderBy(filter => filter.SortOrder)
                    .ThenBy(filter => filter.Name)
                    .Select(filter => new MenuItemFilterDto
                    {
                        Id = filter.Id,
                        RestaurantId = filter.RestaurantId,
                        Name = filter.Name,
                        Slug = filter.Slug,
                        SortOrder = filter.SortOrder
                    })
                    .ToListAsync(ct);
            },
            FilterCacheTtl,
            cancellationToken);
    }

    public async Task<MenuItemFilterDto> CreateFilterAsync(
        MenuItemFilterRequestDto dto,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Filter name is required.");
        }

        var restaurantExists = await _context.Restaurants.AnyAsync(
            restaurant => restaurant.Id == dto.RestaurantId && restaurant.TenantId == tenantId,
            cancellationToken);

        if (!restaurantExists)
        {
            throw new Exception("Restaurant not found or not in tenant.");
        }

        var slug = await CreateUniqueFilterSlugAsync(name, tenantId, cancellationToken);
        var filter = new MenuItemFilter
        {
            TenantId = tenantId,
            RestaurantId = dto.RestaurantId,
            Name = name,
            Slug = slug,
            SortOrder = dto.SortOrder,
            IsActive = true
        };

        _context.MenuItemFilters.Add(filter);
        await _context.SaveChangesAsync(cancellationToken);
        await RefreshMenuItemCachesAsync(tenantId, dto.RestaurantId, cancellationToken);

        return new MenuItemFilterDto
        {
            Id = filter.Id,
            RestaurantId = filter.RestaurantId,
            Name = filter.Name,
            Slug = filter.Slug,
            SortOrder = filter.SortOrder
        };
    }

    public async Task<bool> DeleteFilterAsync(
        int id,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var filter = await _context.MenuItemFilters
            .FirstOrDefaultAsync(current => current.Id == id && current.TenantId == tenantId, cancellationToken);

        if (filter == null)
        {
            return false;
        }

        filter.IsActive = false;
        await _context.SaveChangesAsync(cancellationToken);
        await RefreshMenuItemCachesAsync(tenantId, filter.RestaurantId, cancellationToken);

        return true;
    }

    private static IQueryable<MenuItem> ApplyQuery(IQueryable<MenuItem> menuItems, MenuItemQueryDto? query)
    {
        var search = query?.Search?.Trim();

        if (string.IsNullOrWhiteSpace(search))
        {
            return ApplyFilterQuery(menuItems, query);
        }

        var pattern = $"%{search}%";

        menuItems = menuItems.Where(menuItem =>
            EF.Functions.ILike(menuItem.Name, pattern) ||
            (menuItem.Description != null && EF.Functions.ILike(menuItem.Description, pattern)));

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
            menuItems = menuItems.Where(menuItem =>
                menuItem.FilterAssignments.Any(assignment =>
                    assignment.MenuItemFilter.IsActive &&
                    assignment.MenuItemFilter.Slug == activeFilter));
        }

        return menuItems;
    }

    public async Task<MenuItemDto?> GetByIdAsync(int id, Guid tenantId)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:by-id:{id}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.MenuItems
                .Where(menuItem => menuItem.Id == id &&
                    _context.MenuOfRestaurants.Any(menu =>
                        menu.Id == menuItem.MenuId &&
                        _context.Restaurants.Any(restaurant =>
                            restaurant.Id == menu.RestaurantId &&
                            restaurant.TenantId == tenantId)))
                .OrderBy(menuItem => menuItem.Id)
                .Select(MapMenuItem())
                .FirstOrDefaultAsync(ct),
            CacheTtl);
    }

    public async Task<MenuItemDto> CreateAsync(MenuItemRequestDto dto, Guid tenantId)
    {
        var menuExists = await _context.MenuOfRestaurants
            .AnyAsync(menu =>
                menu.Id == dto.MenuId &&
                _context.Restaurants.Any(restaurant =>
                    restaurant.Id == menu.RestaurantId &&
                    restaurant.TenantId == tenantId));

        if (!menuExists)
            throw new Exception("Menu not found or not in tenant");

        var item = new MenuItem
        {
            MenuId = dto.MenuId,
            Name = dto.Name,
            Price = dto.Price,
            Description = dto.Description,
            ImageUrl = NormalizeOptionalText(dto.ImageUrl),
            ImagePublicId = NormalizeOptionalText(dto.ImagePublicId),
            CookingTime = dto.CookingTime
        };

        _context.MenuItems.Add(item);
        await ApplyFilterAssignmentsAsync(item, dto.FilterIds, tenantId);
        await _context.SaveChangesAsync();

        var restaurantId = await GetRestaurantIdForMenuAsync(dto.MenuId);
        await RefreshMenuItemCachesAsync(tenantId, restaurantId);

        return new MenuItemDto
        {
            Id = item.Id,
            MenuId = item.MenuId,
            Name = item.Name,
            Price = item.Price,
            Description = item.Description,
            ImageUrl = item.ImageUrl,
            ImagePublicId = item.ImagePublicId,
            CookingTime = item.CookingTime,
            Filters = await GetFilterSlugsAsync(dto.FilterIds, tenantId)
        };
    }

    public async Task<bool> UpdateAsync(int id, MenuItemRequestDto dto, Guid tenantId, CancellationToken cancellationToken = default)
    {
        var item = await _context.MenuItems
            .Include(menuItem => menuItem.FilterAssignments)
            .FirstOrDefaultAsync(menuItem => menuItem.Id == id &&
                _context.MenuOfRestaurants.Any(menu =>
                    menu.Id == menuItem.MenuId &&
                    _context.Restaurants.Any(restaurant =>
                        restaurant.Id == menu.RestaurantId &&
                        restaurant.TenantId == tenantId)), cancellationToken);

        if (item == null)
            return false;

        var previousImagePublicId = item.ImagePublicId;
        var nextImagePublicId = NormalizeOptionalText(dto.ImagePublicId);

        item.Name = dto.Name;
        item.Price = dto.Price;
        item.Description = dto.Description;
        item.ImageUrl = NormalizeOptionalText(dto.ImageUrl);
        item.ImagePublicId = nextImagePublicId;
        item.CookingTime = dto.CookingTime;
        await ApplyFilterAssignmentsAsync(item, dto.FilterIds, tenantId);

        await _context.SaveChangesAsync(cancellationToken);

        var restaurantId = await GetRestaurantIdForMenuAsync(item.MenuId, cancellationToken);
        await RefreshMenuItemCachesAsync(tenantId, restaurantId, cancellationToken);

        if (!string.Equals(previousImagePublicId, nextImagePublicId, StringComparison.Ordinal) &&
            !string.IsNullOrWhiteSpace(previousImagePublicId))
        {
            await _cloudinaryService.DeleteImageAsync(previousImagePublicId, cancellationToken);
        }

        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId, CancellationToken cancellationToken = default)
    {
        var item = await _context.MenuItems
            .FirstOrDefaultAsync(menuItem => menuItem.Id == id &&
                _context.MenuOfRestaurants.Any(menu =>
                    menu.Id == menuItem.MenuId &&
                    _context.Restaurants.Any(restaurant =>
                        restaurant.Id == menu.RestaurantId &&
                        restaurant.TenantId == tenantId)), cancellationToken);

        if (item == null)
            return false;

        var imagePublicId = item.ImagePublicId;
        var restaurantId = await GetRestaurantIdForMenuAsync(item.MenuId, cancellationToken);
        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
        await RefreshMenuItemCachesAsync(tenantId, restaurantId, cancellationToken);

        if (!string.IsNullOrWhiteSpace(imagePublicId))
        {
            await _cloudinaryService.DeleteImageAsync(imagePublicId, cancellationToken);
        }

        return true;
    }

    private async Task ApplyFilterAssignmentsAsync(MenuItem item, IEnumerable<int> filterIds, Guid tenantId)
    {
        var requestedFilterIds = filterIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        var restaurantId = await _context.MenuOfRestaurants
            .Where(menu => menu.Id == item.MenuId)
            .Select(menu => menu.RestaurantId)
            .FirstAsync();

        var validFilterIds = await _context.MenuItemFilters
            .Where(filter =>
                filter.TenantId == tenantId &&
                filter.IsActive &&
                requestedFilterIds.Contains(filter.Id) &&
                (filter.RestaurantId == null || filter.RestaurantId == restaurantId))
            .Select(filter => filter.Id)
            .ToListAsync();

        item.FilterAssignments.Clear();

        foreach (var filterId in validFilterIds)
        {
            item.FilterAssignments.Add(new MenuItemFilterAssignment
            {
                MenuItem = item,
                MenuItemFilterId = filterId
            });
        }
    }

    private async Task<List<string>> GetFilterSlugsAsync(IEnumerable<int> filterIds, Guid tenantId)
    {
        var ids = filterIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        return await _context.MenuItemFilters
            .Where(filter => filter.TenantId == tenantId && filter.IsActive && ids.Contains(filter.Id))
            .OrderBy(filter => filter.SortOrder)
            .ThenBy(filter => filter.Name)
            .Select(filter => filter.Slug)
            .ToListAsync();
    }

    private async Task<string> CreateUniqueFilterSlugAsync(string name, Guid tenantId, CancellationToken cancellationToken)
    {
        var baseSlug = Regex.Replace(name.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');

        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "filter";
        }

        var slug = baseSlug;
        var suffix = 2;

        while (await _context.MenuItemFilters.AnyAsync(
            filter => filter.TenantId == tenantId && filter.Slug == slug,
            cancellationToken))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return slug;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private async Task<int> GetRestaurantIdForMenuAsync(int menuId, CancellationToken cancellationToken = default)
    {
        return await _context.MenuOfRestaurants
            .Where(menu => menu.Id == menuId)
            .Select(menu => menu.RestaurantId)
            .FirstAsync(cancellationToken);
    }

    private async Task RefreshMenuItemCachesAsync(Guid tenantId, int? restaurantId, CancellationToken cancellationToken = default)
    {
        await _cache.RefreshVersionAsync(BuildTenantScope(tenantId), cancellationToken);
        await _cache.RefreshVersionAsync(BuildTenantFilterScope(tenantId), cancellationToken);

        if (restaurantId.HasValue)
        {
            await _cache.RefreshVersionAsync(BuildRestaurantScope(restaurantId.Value), cancellationToken);
            await _cache.RefreshVersionAsync(BuildRestaurantFilterScope(restaurantId.Value), cancellationToken);
        }
    }

    private static string BuildTenantScope(Guid tenantId) => $"menu-items:tenant:{tenantId:N}";

    private static string BuildRestaurantScope(int restaurantId) => $"menu-items:restaurant:{restaurantId}";

    private static string BuildTenantFilterScope(Guid tenantId) => $"menu-filters:tenant:{tenantId:N}";

    private static string BuildRestaurantFilterScope(int restaurantId) => $"menu-filters:restaurant:{restaurantId}";

    private static string BuildQueryKey(MenuItemQueryDto? query)
    {
        var search = query?.Search?.Trim().ToLowerInvariant() ?? string.Empty;
        var filters = query?.Filters?
            .Select(filter => filter.Trim().ToLowerInvariant())
            .Where(filter => !string.IsNullOrWhiteSpace(filter))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(filter => filter, StringComparer.Ordinal)
            .ToArray()
            ?? [];

        return $"search:{search}|filters:{string.Join(",", filters)}";
    }

    private static System.Linq.Expressions.Expression<Func<MenuItem, MenuItemDto>> MapMenuItem()
    {
        return menuItem => new MenuItemDto
        {
            Id = menuItem.Id,
            MenuId = menuItem.MenuId,
            Name = menuItem.Name,
            Price = menuItem.Price,
            Description = menuItem.Description,
            ImageUrl = menuItem.ImageUrl,
            ImagePublicId = menuItem.ImagePublicId,
            CookingTime = menuItem.CookingTime,
            Filters = menuItem.FilterAssignments
                .Where(assignment => assignment.MenuItemFilter.IsActive)
                .OrderBy(assignment => assignment.MenuItemFilter.SortOrder)
                .Select(assignment => assignment.MenuItemFilter.Slug)
                .ToList()
        };
    }
}
