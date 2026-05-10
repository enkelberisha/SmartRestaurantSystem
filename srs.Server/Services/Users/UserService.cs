using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Users;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.Supabase;

namespace srs.Server.Services.Users;

public class UserService(AppDbContext context, ISupabaseAdminService supabaseAdminService) : IUserService
{
    private static readonly Regex StrongPasswordRegex = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$",
        RegexOptions.Compiled);

    private static readonly UserRole[] DeviceRoles =
    [
        UserRole.PosDevice,
        UserRole.TableDevice,
        UserRole.KitchenDevice,
        UserRole.HostDevice
    ];

    private static readonly UserRole[] ElevatedRoles =
    [
        UserRole.Pending,
        UserRole.Owner,
        UserRole.Manager,
        UserRole.Admin,
        UserRole.SuperAdmin
    ];

    private static readonly UserRole[] SuperAdminAssignableRoles =
    [
        UserRole.Owner,
        UserRole.Manager,
        UserRole.Admin,
        UserRole.SuperAdmin,
        UserRole.PosDevice,
        UserRole.TableDevice,
        UserRole.KitchenDevice,
        UserRole.HostDevice
    ];

    public async Task<IReadOnlyList<UserResponseDto>> GetAllAsync(
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        return await BuildVisibleUsersQuery(currentUser)
            .AsNoTracking()
            .Include(user => user.Tenant)
            .OrderByDescending(user => user.CreatedAt)
            .Select(user => Map(user))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserResponseDto>> GetStaffCandidatesAsync(
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        return await BuildVisibleUsersQuery(currentUser)
            .AsNoTracking()
            .Include(user => user.Tenant)
            .Where(user => user.Role != UserRole.SuperAdmin)
            .OrderBy(user => user.Email)
            .Select(user => Map(user))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserResponseDto?> GetByIdAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        return await BuildVisibleUsersQuery(currentUser)
            .AsNoTracking()
            .Include(user => user.Tenant)
            .Where(user => user.Id == id)
            .Select(user => Map(user))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<UserResponseDto> CreateAsync(
        CreateUserRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        ValidateAssignableRole(dto.Role, currentUser);

        var email = NormalizeEmail(dto.Email);
        ValidatePassword(dto.Password);

        if (await context.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        var tenant = await ResolveTenantAsync(dto.TenantId, currentUser, cancellationToken);
        var restaurantId = await ResolveRestaurantIdAsync(dto.Role, dto.RestaurantId, tenant?.Id, currentUser, cancellationToken);
        var created = await supabaseAdminService.CreateUserAsync(email, dto.Password, cancellationToken);

        try
        {
            var user = new User
            {
                SupabaseUserId = created.Id,
                Email = created.Email,
                Role = dto.Role,
                TenantId = tenant?.Id,
                RestaurantId = restaurantId,
                IsActivated = IsActivated(dto.Role, tenant?.Id, restaurantId)
            };

            context.Users.Add(user);
            await context.SaveChangesAsync(cancellationToken);

            return Map(user, tenant?.Name);
        }
        catch
        {
            try
            {
                await supabaseAdminService.DeleteUserAsync(created.Id, cancellationToken);
            }
            catch
            {
            }

            throw;
        }
    }

    public async Task<UserResponseDto?> UpdateAsync(
        int id,
        UpdateUserRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        ValidateAssignableRole(dto.Role, currentUser);

        var user = await BuildVisibleUsersQuery(currentUser)
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        if (user.Role == UserRole.SuperAdmin && currentUser.Role != UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("SuperAdmin users cannot be managed from this module.");
        }

        var tenant = await ResolveTenantAsync(dto.TenantId, currentUser, cancellationToken);
        var restaurantId = await ResolveRestaurantIdAsync(dto.Role, dto.RestaurantId, tenant?.Id, currentUser, cancellationToken);

        user.Role = dto.Role;
        user.TenantId = tenant?.Id;
        user.RestaurantId = restaurantId;
        user.IsActivated = IsActivated(dto.Role, tenant?.Id, restaurantId);
        await context.SaveChangesAsync(cancellationToken);

        return Map(user, tenant?.Name);
    }

    public async Task<UserResponseDto?> UpdateEmailAsync(
        int id,
        string email,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);

        var user = await BuildVisibleUsersQuery(currentUser)
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var emailTaken = await context.Users.AnyAsync(
            current => current.Id != id && current.Email == normalizedEmail,
            cancellationToken);

        if (emailTaken)
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        await supabaseAdminService.UpdateUserEmailAsync(user.SupabaseUserId, normalizedEmail, cancellationToken);
        user.Email = normalizedEmail;
        await context.SaveChangesAsync(cancellationToken);

        return Map(user, user.Tenant?.Name);
    }

    public async Task<UserResponseDto?> UpdatePasswordAsync(
        int id,
        string password,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        ValidatePassword(password);

        var user = await BuildVisibleUsersQuery(currentUser)
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        await supabaseAdminService.UpdateUserPasswordAsync(user.SupabaseUserId, password, cancellationToken);
        return Map(user, user.Tenant?.Name);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var user = await BuildVisibleUsersQuery(currentUser)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (user is null)
        {
            return false;
        }

        if (user.Id == currentUser.Id)
        {
            throw new InvalidOperationException("You cannot delete your own user.");
        }

        if (user.Role == UserRole.SuperAdmin && currentUser.Role != UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("SuperAdmin users cannot be deleted from this module.");
        }

        await supabaseAdminService.DeleteUserAsync(user.SupabaseUserId, cancellationToken);
        context.Users.Remove(user);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<User> BuildVisibleUsersQuery(CurrentUserContext currentUser)
    {
        var query = context.Users.AsQueryable();

        if (currentUser.Role == UserRole.SuperAdmin)
        {
            return query;
        }

        if (ElevatedRoles.Contains(currentUser.Role) && currentUser.TenantId.HasValue)
        {
            return query.Where(user => user.TenantId == currentUser.TenantId.Value);
        }

        return query.Where(_ => false);
    }

    private async Task<Tenant?> ResolveTenantAsync(
        Guid? requestedTenantId,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        var tenantId = currentUser.Role == UserRole.SuperAdmin
            ? requestedTenantId
            : currentUser.TenantId;

        if (!tenantId.HasValue)
        {
            throw new InvalidOperationException("A tenant is required for this user.");
        }

        return await context.Tenants.FirstOrDefaultAsync(tenant => tenant.Id == tenantId.Value, cancellationToken)
            ?? throw new InvalidOperationException("Selected tenant was not found.");
    }

    private async Task<int?> ResolveRestaurantIdAsync(
        UserRole role,
        int? requestedRestaurantId,
        Guid? tenantId,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        if (role == UserRole.Owner || role == UserRole.Admin)
        {
            return null;
        }

        if (role == UserRole.Manager)
        {
            if (!requestedRestaurantId.HasValue)
            {
                throw new InvalidOperationException("Managers must be assigned to a restaurant.");
            }

            var managerRestaurantExists = await context.Restaurants.AnyAsync(
                restaurant => restaurant.Id == requestedRestaurantId.Value && (!tenantId.HasValue || restaurant.TenantId == tenantId.Value),
                cancellationToken);

            if (!managerRestaurantExists)
            {
                throw new InvalidOperationException("Selected restaurant was not found for this tenant.");
            }

            return requestedRestaurantId.Value;
        }

        if (!DeviceRoles.Contains(role))
        {
            return null;
        }

        var restaurantId = currentUser.Role == UserRole.SuperAdmin
            ? requestedRestaurantId
            : currentUser.RestaurantId ?? requestedRestaurantId;

        if (!restaurantId.HasValue)
        {
            throw new InvalidOperationException("Device accounts must be assigned to a restaurant.");
        }

        var restaurantExists = await context.Restaurants.AnyAsync(
            restaurant => restaurant.Id == restaurantId.Value && (!tenantId.HasValue || restaurant.TenantId == tenantId.Value),
            cancellationToken);

        if (!restaurantExists)
        {
            throw new InvalidOperationException("Selected restaurant was not found for this tenant.");
        }

        return restaurantId.Value;
    }

    private static void ValidateAssignableRole(UserRole role, CurrentUserContext currentUser)
    {
        if (currentUser.Role == UserRole.SuperAdmin)
        {
            if (!SuperAdminAssignableRoles.Contains(role))
            {
                throw new InvalidOperationException("This role cannot be assigned.");
            }

            return;
        }

        if (!ElevatedRoles.Contains(currentUser.Role))
        {
            throw new InvalidOperationException("You are not allowed to manage users.");
        }

        if (!DeviceRoles.Contains(role))
        {
            throw new InvalidOperationException("Owners, managers, and admins can only create or update device accounts.");
        }
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

    private static UserResponseDto Map(User user, string? tenantName = null)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            SupabaseUserId = user.SupabaseUserId,
            Email = user.Email,
            Role = user.Role,
            TenantId = user.TenantId,
            RestaurantId = user.RestaurantId,
            TenantName = tenantName ?? user.Tenant?.Name,
            CreatedAt = user.CreatedAt
        };
    }
}
