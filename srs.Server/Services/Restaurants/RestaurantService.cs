using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services;

namespace srs.Server.Services.Restaurants;

public class RestaurantService : IRestaurantService
{
    private readonly AppDbContext _context;
    private readonly ILogger<RestaurantService> _logger;

    public RestaurantService(AppDbContext context, ILogger<RestaurantService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RestaurantDto?> GetCurrentAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default)
    {
        var query = currentUser.TenantId.HasValue
            ? _context.Restaurants.Where(r => r.TenantId == currentUser.TenantId.Value)
            : _context.Restaurants.Where(r => r.OwnerId == currentUser.Id || r.ManagerId == currentUser.Id);

        return await query
            .Select(r => new RestaurantDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Name = r.Name,
                Location = r.Location,
                OwnerId = r.OwnerId,
                ManagerId = r.ManagerId
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<RestaurantDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.Restaurants
            .Where(r => r.TenantId == tenantId)
            .Select(r => new RestaurantDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Name = r.Name,
                Location = r.Location,
                OwnerId = r.OwnerId,
                ManagerId = r.ManagerId
            })
            .ToListAsync();
    }

    public async Task<RestaurantDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.Restaurants
            .Where(r => r.Id == id && r.TenantId == tenantId)
            .Select(r => new RestaurantDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Name = r.Name,
                Location = r.Location,
                OwnerId = r.OwnerId,
                ManagerId = r.ManagerId
            })
            .FirstOrDefaultAsync();
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

        var restaurant = new Restaurant
        {
            TenantId = tenantId.Value,
            Name = dto.Name.Trim(),
            Location = dto.Location.Trim(),
            OwnerId = currentUser.Role == UserRole.Owner ? currentUser.Id : dto.OwnerId,
            ManagerId = dto.ManagerId
        };

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Restaurant created: {Name}", restaurant.Name);

        return new RestaurantDto
        {
            Id = restaurant.Id,
            TenantId = restaurant.TenantId,
            Name = restaurant.Name,
            Location = restaurant.Location,
            OwnerId = restaurant.OwnerId,
            ManagerId = restaurant.ManagerId
        };
    }

    public async Task<RestaurantDto?> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return null;

        restaurant.Name = dto.Name;
        restaurant.Location = dto.Location;
        restaurant.OwnerId = dto.OwnerId;
        restaurant.ManagerId = dto.ManagerId;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restaurant updated: {Id}", id);

        return new RestaurantDto
        {
            Id = restaurant.Id,
            TenantId = restaurant.TenantId,
            Name = restaurant.Name,
            Location = restaurant.Location,
            OwnerId = restaurant.OwnerId,
            ManagerId = restaurant.ManagerId
        };
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return false;

        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Restaurant deleted: {Id}", id);

        return true;
    }
}
