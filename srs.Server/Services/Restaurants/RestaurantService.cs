using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

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
            .OrderBy(r => r.Name)
            .ThenBy(r => r.Id)
            .Select(r => new RestaurantDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Name = r.Name,
                Location = r.Location,
                CuisineType = r.CuisineType,
                ContactEmail = r.ContactEmail,
                ContactPhone = r.ContactPhone,
                LogoUrl = r.LogoUrl,
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
                CuisineType = r.CuisineType,
                ContactEmail = r.ContactEmail,
                ContactPhone = r.ContactPhone,
                LogoUrl = r.LogoUrl,
                OwnerId = r.OwnerId,
                ManagerId = r.ManagerId
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<SystemRestaurantDto>> GetAllSystemWideAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Restaurants
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
            .ToListAsync(cancellationToken);
    }

    public async Task<RestaurantDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.Restaurants
            .Where(r => r.Id == id && r.TenantId == tenantId)
            .OrderBy(r => r.Id)
            .Select(r => new RestaurantDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Name = r.Name,
                Location = r.Location,
                CuisineType = r.CuisineType,
                ContactEmail = r.ContactEmail,
                ContactPhone = r.ContactPhone,
                LogoUrl = r.LogoUrl,
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
            CuisineType = dto.CuisineType?.Trim(),
            ContactEmail = dto.ContactEmail?.Trim(),
            ContactPhone = dto.ContactPhone?.Trim(),
            LogoUrl = dto.LogoUrl?.Trim(),
            OwnerId = currentUser.Role == UserRole.Owner ? currentUser.Id : dto.OwnerId,
            ManagerId = dto.ManagerId
        };

        await ValidateAssignmentsAsync(dto, tenantId.Value, cancellationToken);

        _context.Restaurants.Add(restaurant);
        await SyncAssignmentRolesAsync(dto, tenantId.Value, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Restaurant created: {Name}", restaurant.Name);

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

    public async Task<RestaurantDto?> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);

        if (restaurant == null)
            return null;

        await ValidateAssignmentsAsync(dto, tenantId);

        restaurant.Name = dto.Name;
        restaurant.Location = dto.Location;
        restaurant.CuisineType = dto.CuisineType;
        restaurant.ContactEmail = dto.ContactEmail;
        restaurant.ContactPhone = dto.ContactPhone;
        restaurant.LogoUrl = dto.LogoUrl;
        restaurant.OwnerId = dto.OwnerId;
        restaurant.ManagerId = dto.ManagerId;

        await SyncAssignmentRolesAsync(dto, tenantId);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Restaurant updated: {Id}", id);

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
        }

        if (dto.ManagerId.HasValue)
        {
            var managerExists = await _context.Users.AnyAsync(user =>
                user.Id == dto.ManagerId.Value &&
                user.TenantId == tenantId,
                cancellationToken);

            if (!managerExists)
                throw new InvalidOperationException("Selected manager was not found in this tenant.");
        }
    }

    private async Task SyncAssignmentRolesAsync(
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
            }
        }
    }
}
