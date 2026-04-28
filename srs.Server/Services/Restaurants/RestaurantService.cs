using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models;

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

    public async Task<RestaurantDto> CreateAsync(RestaurantRequestDto dto, Guid tenantId)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Name is required");

        var restaurant = new Restaurant
        {
            TenantId = tenantId,
            Name = dto.Name,
            Location = dto.Location,
            OwnerId = dto.OwnerId,
            ManagerId = dto.ManagerId
        };

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();

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

    public async Task<bool> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return false;

        restaurant.Name = dto.Name;
        restaurant.Location = dto.Location;
        restaurant.OwnerId = dto.OwnerId;
        restaurant.ManagerId = dto.ManagerId;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restaurant updated: {Id}", id);

        return true;
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