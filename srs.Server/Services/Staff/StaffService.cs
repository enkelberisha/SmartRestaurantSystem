using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Staff;

namespace srs.Server.Services.Staff;

public class StaffService(AppDbContext context) : IStaffService
{
    public async Task<StaffResponseDto> CreateAsync(StaffRequestDto dto, Guid tenantId, CancellationToken ct)
    {
        await ValidateAsync(dto, null, tenantId, ct);

        var entity = new Models.Staff
        {
            TenantId = tenantId,
            RestaurantId = dto.RestaurantId,
            FullName = dto.FullName.Trim(),
            CredentialHash = HashCredential(dto.CredentialValue),
            CredentialType = dto.CredentialType,
            IsActive = dto.IsActive
        };

        context.Staff.Add(entity);
        await context.SaveChangesAsync(ct);

        return Map(entity);
    }

    public async Task<List<StaffResponseDto>> GetAllAsync(Guid tenantId)
    {
        return await context.Staff
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => Map(s))
            .ToListAsync();
    }

    public async Task<List<StaffResponseDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken ct)
    {
        return await context.Staff
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.RestaurantId == restaurantId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => Map(s))
            .ToListAsync(ct);
    }

    public async Task<StaffResponseDto?> GetByIdAsync(int id, Guid tenantId)
    {
        var entity = await context.Staff
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

        return entity is null ? null : Map(entity);
    }

    public async Task<StaffResponseDto?> UpdateAsync(int id, StaffRequestDto dto, Guid tenantId, CancellationToken ct)
    {
        var entity = await context.Staff
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct);

        if (entity is null)
        {
            return null;
        }

        await ValidateAsync(dto, id, tenantId, ct);

        entity.RestaurantId = dto.RestaurantId;
        entity.FullName = dto.FullName.Trim();
        entity.CredentialHash = HashCredential(dto.CredentialValue);
        entity.CredentialType = dto.CredentialType;
        entity.IsActive = dto.IsActive;

        await context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId, CancellationToken ct)
    {
        var entity = await context.Staff
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct);

        if (entity is null)
        {
            return false;
        }

        context.Staff.Remove(entity);
        await context.SaveChangesAsync(ct);
        return true;
    }

    private async Task ValidateAsync(StaffRequestDto dto, int? currentId, Guid tenantId, CancellationToken ct)
    {
        if (dto.RestaurantId <= 0)
        {
            throw new InvalidOperationException("RestaurantId is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.CredentialValue))
        {
            throw new InvalidOperationException("Waiter credential is required.");
        }

        var restaurantExists = await context.Restaurants
            .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId, ct);

        if (!restaurantExists)
        {
            throw new InvalidOperationException("Restaurant does not exist.");
        }

        var credentialHash = HashCredential(dto.CredentialValue);
        var duplicateCredential = await context.Staff.AnyAsync(
            s => s.TenantId == tenantId &&
                 s.RestaurantId == dto.RestaurantId &&
                 s.CredentialHash == credentialHash &&
                 (currentId == null || s.Id != currentId.Value),
            ct);

        if (duplicateCredential)
        {
            throw new InvalidOperationException("That waiter credential is already in use for this restaurant.");
        }
    }

    private static StaffResponseDto Map(Models.Staff staff) => new()
    {
        Id = staff.Id,
        TenantId = staff.TenantId,
        RestaurantId = staff.RestaurantId,
        FullName = staff.FullName,
        IsActive = staff.IsActive,
        CreatedAt = staff.CreatedAt,
        CredentialType = staff.CredentialType
    };

    public static string HashCredential(string credentialValue)
    {
        var normalized = credentialValue.Trim().ToUpperInvariant();
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(hashBytes);
    }
}
