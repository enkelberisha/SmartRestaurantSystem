using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using srs.Server.Data;
using srs.Server.Dtos.Superadmin;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Supabase;

namespace srs.Server.Services.Superadmin;

public class SuperadminUserService(AppDbContext context, ISupabaseAdminService supabaseAdminService) : ISuperadminUserService
{
    private static readonly Regex StrongPasswordRegex = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$",
        RegexOptions.Compiled);

    public async Task<IReadOnlyList<SuperadminUserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await context.Users
            .AsNoTracking()
            .Include(user => user.Tenant)
            .OrderByDescending(user => user.CreatedAt)
            .Select(user => new SuperadminUserDto(
                user.Id,
                user.SupabaseUserId,
                user.Email,
                user.Role,
                user.IsActivated,
                user.TenantId,
                user.RestaurantId,
                user.Tenant != null ? user.Tenant.Name : null,
                user.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<SuperadminUserDto> CreateAsync(CreateSuperadminUserRequestDto dto, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(dto.Email);
        ValidatePassword(dto.Password);

        if (!Enum.IsDefined(dto.Role) || dto.Role is UserRole.SuperAdmin or UserRole.Pending)
        {
            throw new InvalidOperationException("Only tenant-scoped roles can be created from this screen.");
        }

        if (await context.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        var tenant = await ResolveTenantAsync(dto.TenantId, cancellationToken);
        await EnsureSingleOwnerPerTenantAsync(dto.Role, tenant.Id, null, cancellationToken);
        var restaurantId = await ResolveRestaurantIdAsync(dto.Role, dto.RestaurantId, tenant.Id, cancellationToken);

        var created = await supabaseAdminService.CreateUserAsync(email, dto.Password, cancellationToken);

        try
        {
            var user = new User
            {
                SupabaseUserId = created.Id,
                Email = created.Email,
                Role = dto.Role,
                TenantId = tenant.Id,
                RestaurantId = restaurantId,
                IsActivated = IsActivated(dto.Role, tenant.Id, restaurantId)
            };

            context.Users.Add(user);
            await context.SaveChangesAsync(cancellationToken);
            await SyncTenantOwnerAssignmentsAsync(tenant.Id, user, null, cancellationToken);

            return new SuperadminUserDto(
                user.Id,
                user.SupabaseUserId,
                user.Email,
                user.Role,
                user.IsActivated,
                user.TenantId,
                user.RestaurantId,
                tenant.Name,
                user.CreatedAt);
        }
        catch
        {
            try
            {
                await supabaseAdminService.DeleteUserAsync(created.Id, cancellationToken);
            }
            catch
            {
                // Keep the original create failure visible even if cleanup is unavailable.
            }

            throw;
        }
    }

    public async Task<SuperadminUserDto?> UpdateAsync(int userId, UpdateSuperadminUserRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(dto.Role) || dto.Role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("Only tenant-scoped roles can be assigned from this screen.");
        }

        var user = await context.Users
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == userId, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var previousRole = user.Role;
        var previousTenantId = user.TenantId;
        var tenant = await ResolveTenantAsync(dto.TenantId, cancellationToken);
        await EnsureSingleOwnerPerTenantAsync(dto.Role, tenant.Id, userId, cancellationToken);
        var restaurantId = await ResolveRestaurantIdAsync(dto.Role, dto.RestaurantId, tenant.Id, cancellationToken);

        user.Role = dto.Role;
        user.TenantId = tenant.Id;
        user.RestaurantId = restaurantId;
        user.IsActivated = IsActivated(dto.Role, tenant.Id, restaurantId);
        await context.SaveChangesAsync(cancellationToken);
        await SyncTenantOwnerAssignmentsAsync(tenant.Id, user, previousRole == UserRole.Owner ? previousTenantId : null, cancellationToken);

        return new SuperadminUserDto(
            user.Id,
            user.SupabaseUserId,
            user.Email,
            user.Role,
            user.IsActivated,
            user.TenantId,
            user.RestaurantId,
            tenant.Name,
            user.CreatedAt);
    }

    public async Task<SuperadminUserDto?> UpdateRoleAsync(int userId, UpdateSuperadminUserRoleRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(dto.Role))
        {
            throw new InvalidOperationException("Invalid role.");
        }

        var user = await context.Users
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == userId, cancellationToken);

        if (user is null)
        {
            return null;
        }

        if (dto.Role == UserRole.Owner)
        {
            if (!user.TenantId.HasValue)
            {
                throw new InvalidOperationException("An owner must belong to a tenant.");
            }

            await EnsureSingleOwnerPerTenantAsync(dto.Role, user.TenantId.Value, user.Id, cancellationToken);
        }

        var previousRole = user.Role;
        var previousTenantId = user.TenantId;
        user.Role = dto.Role;
        user.IsActivated = IsActivated(user.Role, user.TenantId, user.RestaurantId);
        await context.SaveChangesAsync(cancellationToken);
        await SyncTenantOwnerAssignmentsAsync(user.TenantId, user, previousRole == UserRole.Owner ? previousTenantId : null, cancellationToken);

        return new SuperadminUserDto(
            user.Id,
            user.SupabaseUserId,
            user.Email,
            user.Role,
            user.IsActivated,
            user.TenantId,
            user.RestaurantId,
            user.Tenant?.Name,
            user.CreatedAt);
    }

    public async Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(current => current.Id == userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        await supabaseAdminService.DeleteUserAsync(user.SupabaseUserId, cancellationToken);
        context.Users.Remove(user);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string NormalizeEmail(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            throw new ArgumentException("Email is required.");
        }

        return normalizedEmail;
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Password is required.");
        }

        if (!StrongPasswordRegex.IsMatch(password))
        {
            throw new ArgumentException("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
        }
    }

    private async Task<Tenant> ResolveTenantAsync(Guid? tenantId, CancellationToken cancellationToken)
    {
        if (!tenantId.HasValue)
        {
            throw new InvalidOperationException("A tenant is required for this user.");
        }

        return await context.Tenants.FirstOrDefaultAsync(current => current.Id == tenantId.Value, cancellationToken)
            ?? throw new InvalidOperationException("Selected tenant was not found.");
    }

    private async Task<int?> ResolveRestaurantIdAsync(UserRole role, int? restaurantId, Guid? tenantId, CancellationToken cancellationToken)
    {
        if (role == UserRole.Owner || role == UserRole.Admin)
        {
            return null;
        }

        if (role == UserRole.Manager)
        {
            if (!restaurantId.HasValue)
            {
                return null;
            }

            var managerRestaurantExists = await context.Restaurants.AnyAsync(
                restaurant => restaurant.Id == restaurantId.Value && (!tenantId.HasValue || restaurant.TenantId == tenantId.Value),
                cancellationToken);

            if (!managerRestaurantExists)
            {
                throw new InvalidOperationException("Selected restaurant was not found for this tenant.");
            }

            return restaurantId.Value;
        }

        if (role != UserRole.PosDevice && role != UserRole.TableDevice && role != UserRole.KitchenDevice && role != UserRole.HostDevice)
        {
            return null;
        }

        if (!restaurantId.HasValue)
        {
            throw new InvalidOperationException("This role must be assigned to a restaurant.");
        }

        var exists = await context.Restaurants.AnyAsync(
            restaurant => restaurant.Id == restaurantId.Value && (!tenantId.HasValue || restaurant.TenantId == tenantId.Value),
            cancellationToken);

        if (!exists)
        {
            throw new InvalidOperationException("Selected restaurant was not found for this tenant.");
        }

        return restaurantId.Value;
    }

    private static bool IsActivated(UserRole role, Guid? tenantId, int? restaurantId)
    {
        if (role == UserRole.Pending)
        {
            return false;
        }

        if (role == UserRole.SuperAdmin)
        {
            return true;
        }

        if (!tenantId.HasValue)
        {
            return false;
        }

        return role switch
        {
            UserRole.Manager or UserRole.PosDevice or UserRole.TableDevice or UserRole.KitchenDevice or UserRole.HostDevice
                => restaurantId.HasValue,
            _ => true
        };
    }

    private async Task EnsureSingleOwnerPerTenantAsync(
        UserRole role,
        Guid tenantId,
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        if (role != UserRole.Owner)
        {
            return;
        }

        var existingOwnerExists = await context.Users.AnyAsync(
            user => user.TenantId == tenantId &&
                user.Role == UserRole.Owner &&
                (!currentUserId.HasValue || user.Id != currentUserId.Value),
            cancellationToken);

        if (existingOwnerExists)
        {
            throw new InvalidOperationException("This tenant already has an owner.");
        }
    }

    private async Task SyncTenantOwnerAssignmentsAsync(
        Guid? tenantId,
        User user,
        Guid? previousOwnerTenantId,
        CancellationToken cancellationToken)
    {
        if (previousOwnerTenantId.HasValue &&
            (user.Role != UserRole.Owner || previousOwnerTenantId != tenantId))
        {
            await context.Restaurants
                .Where(restaurant => restaurant.TenantId == previousOwnerTenantId.Value && restaurant.OwnerId == user.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(restaurant => restaurant.OwnerId, (int?)null), cancellationToken);
        }

        if (user.Role != UserRole.Owner || !tenantId.HasValue)
        {
            return;
        }

        user.RestaurantId = null;
        user.IsActivated = true;

        await context.Restaurants
            .Where(restaurant => restaurant.TenantId == tenantId.Value)
            .ExecuteUpdateAsync(setters => setters.SetProperty(restaurant => restaurant.OwnerId, user.Id), cancellationToken);
    }
}
