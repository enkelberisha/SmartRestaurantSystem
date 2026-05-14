using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.Caching;

namespace srs.Server.Services.Restaurants;

public class RestaurantService : IRestaurantService
{
    private readonly AppDbContext _context;
    private readonly ILogger<RestaurantService> _logger;
    private readonly IAppCache _cache;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public RestaurantService(AppDbContext context, ILogger<RestaurantService> logger, IAppCache cache)
    {
        _context = context;
        _logger = logger;
        _cache = cache;
    }

    public async Task<RestaurantDto?> GetCurrentAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default)
    {
        var scope = currentUser.TenantId.HasValue
            ? BuildTenantScope(currentUser.TenantId.Value)
            : BuildCurrentUserScope(currentUser.Id);
        var version = await _cache.GetVersionAsync(scope, cancellationToken);
        var key = $"{scope}:current:{currentUser.Id}:{currentUser.Role}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            async ct =>
            {
                var query = currentUser.TenantId.HasValue
                    ? _context.Restaurants.Where(r => r.TenantId == currentUser.TenantId.Value)
                    : _context.Restaurants.Where(r => r.OwnerId == currentUser.Id || r.ManagerId == currentUser.Id);

                return await query
                    .OrderBy(r => r.Name)
                    .ThenBy(r => r.Id)
                    .Select(MapRestaurant())
                    .FirstOrDefaultAsync(ct);
            },
            CacheTtl,
            cancellationToken);
    }

    public async Task<List<RestaurantDto>> GetAllAsync(Guid tenantId)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:all:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.Restaurants
                .Where(r => r.TenantId == tenantId)
                .OrderBy(r => r.Name)
                .ThenBy(r => r.Id)
                .Select(MapRestaurant())
                .ToListAsync(ct),
            CacheTtl);
    }

    public async Task<IReadOnlyList<SystemRestaurantDto>> GetAllSystemWideAsync(CancellationToken cancellationToken = default)
    {
        const string scope = "restaurants:system";
        var version = await _cache.GetVersionAsync(scope, cancellationToken);
        var key = $"{scope}:all:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.Restaurants
                .AsNoTracking()
                .Include(restaurant => restaurant.Tenant)
                .OrderBy(restaurant => restaurant.Tenant.Name)
                .ThenBy(restaurant => restaurant.Name)
                .Select(restaurant => new SystemRestaurantDto(
                    restaurant.Id,
                    restaurant.TenantId,
                    restaurant.Tenant.Name,
                    restaurant.Name,
                    restaurant.Location,
                    restaurant.OwnerId,
                    restaurant.ManagerId))
                .ToListAsync(ct),
            CacheTtl,
            cancellationToken);
    }

    public async Task<RestaurantDto?> GetByIdAsync(int id, Guid tenantId)
    {
        var scope = BuildTenantScope(tenantId);
        var version = await _cache.GetVersionAsync(scope);
        var key = $"{scope}:by-id:{id}:{version}";

        return await _cache.GetOrCreateAsync(
            key,
            ct => _context.Restaurants
                .Where(r => r.Id == id && r.TenantId == tenantId)
                .OrderBy(r => r.Id)
                .Select(MapRestaurant())
                .FirstOrDefaultAsync(ct),
            CacheTtl);
    }

    public async Task<RestaurantDto> CreateAsync(
        RestaurantRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Name is required");

        if (string.IsNullOrWhiteSpace(dto.Location))
            throw new ArgumentException("Location is required");

        var user = await _context.Users
            .FirstAsync(u => u.Id == currentUser.Id, cancellationToken);

        var tenantId = user.TenantId;
        if (!tenantId.HasValue)
        {
            var tenant = new Tenant
            {
                Name = $"{dto.Name.Trim()} Tenant",
                IsActive = true
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync(cancellationToken);

            user.TenantId = tenant.Id;
            tenantId = tenant.Id;
            await _context.SaveChangesAsync(cancellationToken);
        }

        var tenantOwnerId = await GetTenantOwnerIdAsync(tenantId.Value, cancellationToken);

        var restaurant = new Restaurant
        {
            TenantId = tenantId.Value,
            Name = dto.Name.Trim(),
            Location = dto.Location.Trim(),
            CuisineType = dto.CuisineType?.Trim(),
            ContactEmail = dto.ContactEmail?.Trim(),
            ContactPhone = dto.ContactPhone?.Trim(),
            LogoUrl = dto.LogoUrl?.Trim(),
            OwnerId = tenantOwnerId ?? (currentUser.Role == UserRole.Owner ? currentUser.Id : null),
            ManagerId = dto.ManagerId
        };

        await ValidateAssignmentsAsync(dto, tenantId.Value, cancellationToken);

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync(cancellationToken);
        await SyncAssignmentRolesAsync(restaurant.Id, null, null, dto, tenantId.Value, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        await RefreshRestaurantCachesAsync(tenantId.Value, currentUser.Id, cancellationToken);

        _logger.LogInformation("Restaurant created: {Name}", restaurant.Name);

        return MapRestaurantDto(restaurant);
    }

    public async Task<RestaurantDto?> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return null;

        await ValidateAssignmentsAsync(dto, tenantId);

        var tenantOwnerId = await GetTenantOwnerIdAsync(tenantId);
        var previousOwnerId = restaurant.OwnerId;
        var previousManagerId = restaurant.ManagerId;

        restaurant.Name = dto.Name;
        restaurant.Location = dto.Location;
        restaurant.CuisineType = dto.CuisineType;
        restaurant.ContactEmail = dto.ContactEmail;
        restaurant.ContactPhone = dto.ContactPhone;
        restaurant.LogoUrl = dto.LogoUrl;
        restaurant.OwnerId = tenantOwnerId;
        restaurant.ManagerId = dto.ManagerId;

        await _context.SaveChangesAsync();
        await SyncAssignmentRolesAsync(id, previousOwnerId, previousManagerId, dto, tenantId);
        await _context.SaveChangesAsync();
        await RefreshRestaurantCachesAsync(tenantId);

        _logger.LogInformation("Restaurant updated: {Id}", id);

        return MapRestaurantDto(restaurant);
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return false;

        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync();
        await RefreshRestaurantCachesAsync(tenantId);

        _logger.LogInformation("Restaurant deleted: {Id}", id);

        return true;
    }

    private async Task ValidateAssignmentsAsync(
        RestaurantRequestDto dto,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (dto.OwnerId.HasValue && dto.ManagerId.HasValue && dto.OwnerId == dto.ManagerId)
        {
            throw new InvalidOperationException("Owner and manager must be different users.");
        }

        if (dto.OwnerId.HasValue)
        {
            var ownerExists = await _context.Users.AnyAsync(user =>
                user.Id == dto.OwnerId.Value &&
                user.TenantId == tenantId,
                cancellationToken);

            if (!ownerExists)
                throw new InvalidOperationException("Selected owner was not found in this tenant.");

            var conflictingOwnerExists = await _context.Users.AnyAsync(user =>
                user.Id != dto.OwnerId.Value &&
                user.TenantId == tenantId &&
                user.Role == UserRole.Owner,
                cancellationToken);

            if (conflictingOwnerExists)
                throw new InvalidOperationException("This tenant already has an owner.");
        }

        if (dto.ManagerId.HasValue)
        {
            var managerExists = await _context.Users.AnyAsync(user =>
                user.Id == dto.ManagerId.Value &&
                user.TenantId == tenantId &&
                user.Role == UserRole.Manager,
                cancellationToken);

            if (!managerExists)
                throw new InvalidOperationException("Selected manager must be an existing manager in this tenant.");
        }
    }

    private async Task SyncAssignmentRolesAsync(
        int restaurantId,
        int? previousOwnerId,
        int? previousManagerId,
        RestaurantRequestDto dto,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (dto.OwnerId.HasValue)
        {
            var owner = await _context.Users.FirstOrDefaultAsync(
                user => user.Id == dto.OwnerId.Value && user.TenantId == tenantId,
                cancellationToken);

            if (owner != null)
            {
                owner.Role = UserRole.Owner;
                owner.TenantId = tenantId;
                owner.RestaurantId = null;
                owner.IsActivated = true;

                await AssignOwnerToTenantRestaurantsAsync(owner.Id, tenantId, cancellationToken);
            }
        }
        else
        {
            var tenantOwnerId = await GetTenantOwnerIdAsync(tenantId, cancellationToken);
            if (tenantOwnerId.HasValue)
            {
                await AssignOwnerToTenantRestaurantsAsync(tenantOwnerId.Value, tenantId, cancellationToken);
            }
        }

        if (dto.ManagerId.HasValue)
        {
            var manager = await _context.Users.FirstOrDefaultAsync(
                user => user.Id == dto.ManagerId.Value && user.TenantId == tenantId,
                cancellationToken);

            if (manager != null)
            {
                manager.Role = UserRole.Manager;
                manager.TenantId = tenantId;
                manager.RestaurantId = restaurantId;
                manager.IsActivated = true;
            }
        }

        if (previousOwnerId.HasValue && previousOwnerId != dto.OwnerId)
        {
            var previousOwner = await _context.Users.FirstOrDefaultAsync(
                user => user.Id == previousOwnerId.Value && user.TenantId == tenantId,
                cancellationToken);

            if (previousOwner != null)
            {
                previousOwner.RestaurantId = null;
                previousOwner.IsActivated = previousOwner.Role != UserRole.Pending && previousOwner.TenantId.HasValue;
            }
        }

        if (previousManagerId.HasValue && previousManagerId != dto.ManagerId)
        {
            var previousManager = await _context.Users.FirstOrDefaultAsync(
                user => user.Id == previousManagerId.Value && user.TenantId == tenantId,
                cancellationToken);

            if (previousManager != null)
            {
                var nextManagedRestaurantId = await _context.Restaurants
                    .Where(restaurant => restaurant.TenantId == tenantId && restaurant.ManagerId == previousManager.Id)
                    .Select(restaurant => (int?)restaurant.Id)
                    .FirstOrDefaultAsync(cancellationToken);

                previousManager.RestaurantId = nextManagedRestaurantId;
                previousManager.IsActivated = previousManager.Role != UserRole.Pending &&
                    previousManager.TenantId.HasValue &&
                    nextManagedRestaurantId.HasValue;
            }
        }
    }

    private async Task<int?> GetTenantOwnerIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .Where(user => user.TenantId == tenantId && user.Role == UserRole.Owner)
            .OrderBy(user => user.Id)
            .Select(user => (int?)user.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task AssignOwnerToTenantRestaurantsAsync(int ownerId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        await _context.Restaurants
            .Where(restaurant => restaurant.TenantId == tenantId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(restaurant => restaurant.OwnerId, ownerId), cancellationToken);
    }

    private async Task RefreshRestaurantCachesAsync(Guid tenantId, int? currentUserId = null, CancellationToken cancellationToken = default)
    {
        await _cache.RefreshVersionAsync(BuildTenantScope(tenantId), cancellationToken);
        await _cache.RefreshVersionAsync("restaurants:system", cancellationToken);

        if (currentUserId.HasValue)
        {
            await _cache.RefreshVersionAsync(BuildCurrentUserScope(currentUserId.Value), cancellationToken);
        }
    }

    private static string BuildTenantScope(Guid tenantId) => $"restaurants:tenant:{tenantId:N}";

    private static string BuildCurrentUserScope(int userId) => $"restaurants:user:{userId}";

    private static System.Linq.Expressions.Expression<Func<Restaurant, RestaurantDto>> MapRestaurant()
    {
        return restaurant => new RestaurantDto
        {
            Id = restaurant.Id,
            TenantId = restaurant.TenantId,
            Name = restaurant.Name,
            Location = restaurant.Location,
            CuisineType = restaurant.CuisineType,
            ContactEmail = restaurant.ContactEmail,
            ContactPhone = restaurant.ContactPhone,
            LogoUrl = restaurant.LogoUrl,
            OwnerId = restaurant.OwnerId,
            ManagerId = restaurant.ManagerId
        };
    }

    private static RestaurantDto MapRestaurantDto(Restaurant restaurant)
    {
        return new RestaurantDto
        {
            Id = restaurant.Id,
            TenantId = restaurant.TenantId,
            Name = restaurant.Name,
            Location = restaurant.Location,
            CuisineType = restaurant.CuisineType,
            ContactEmail = restaurant.ContactEmail,
            ContactPhone = restaurant.ContactPhone,
            LogoUrl = restaurant.LogoUrl,
            OwnerId = restaurant.OwnerId,
            ManagerId = restaurant.ManagerId
        };
    }
}
