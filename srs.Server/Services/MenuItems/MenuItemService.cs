using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using srs.Server.Data;
using srs.Server.Dtos.MenuItems;
using srs.Server.Models;
using srs.Server.Services.Cloudinary;

namespace srs.Server.Services.MenuItems;

public class MenuItemService : IMenuItemService
{
    private readonly AppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;

    public MenuItemService(AppDbContext context, ICloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
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
                ImageUrl = mi.ImageUrl,
                ImagePublicId = mi.ImagePublicId,
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
                ImageUrl = mi.ImageUrl,
                ImagePublicId = mi.ImagePublicId,
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
            .ToListAsync(cancellationToken);
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
            .FirstOrDefaultAsync(filter => filter.Id == id && filter.TenantId == tenantId, cancellationToken);

        if (filter == null)
        {
            return false;
        }

        filter.IsActive = false;
        await _context.SaveChangesAsync(cancellationToken);

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
            .OrderBy(mi => mi.Id)
            .Select(mi => new MenuItemDto
            {
                Id = mi.Id,
                MenuId = mi.MenuId,
                Name = mi.Name,
                Price = mi.Price,
                Description = mi.Description,
                ImageUrl = mi.ImageUrl,
                ImagePublicId = mi.ImagePublicId,
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
            ImageUrl = NormalizeOptionalText(dto.ImageUrl),
            ImagePublicId = NormalizeOptionalText(dto.ImagePublicId),
            CookingTime = dto.CookingTime
        };

        _context.MenuItems.Add(item);
        await ApplyFilterAssignmentsAsync(item, dto.FilterIds, tenantId);
        await _context.SaveChangesAsync();

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
            .Include(mi => mi.FilterAssignments)
            .FirstOrDefaultAsync(mi => mi.Id == id &&
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)), cancellationToken);

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
            .FirstOrDefaultAsync(mi => mi.Id == id &&
                _context.MenuOfRestaurants.Any(m =>
                    m.Id == mi.MenuId &&
                    _context.Restaurants.Any(r =>
                        r.Id == m.RestaurantId &&
                        r.TenantId == tenantId)), cancellationToken);

        if (item == null)
            return false;

        var imagePublicId = item.ImagePublicId;
        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);

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
}

