using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using srs.Server.Data;
using srs.Server.Dtos.Users;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.Staff;
using srs.Server.Services.Supabase;

namespace srs.Server.Services.Users;

public class UserService(AppDbContext context, ISupabaseAdminService supabaseAdminService) : IUserService
{
    private static readonly Regex StrongPasswordRegex = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$",
        RegexOptions.Compiled);

    private static readonly UserRole[] TenantAssignableRoles =
    [
        UserRole.Owner,
        UserRole.Manager,
        UserRole.User,
        UserRole.Admin
    ];

    public async Task<IReadOnlyList<UserResponseDto>> GetAllAsync(
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var query = BuildVisibleUsersQuery(currentUser);

        return await query
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
        ValidateAssignableRole(dto.Role);

        var email = NormalizeEmail(dto.Email);
        ValidatePassword(dto.Password);

        if (await context.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        var tenant = await ResolveTenantAsync(dto.TenantId, currentUser, cancellationToken);
        var created = await supabaseAdminService.CreateUserAsync(email, dto.Password, cancellationToken);

        try
        {
            var user = new User
            {
                SupabaseUserId = created.Id,
                Email = created.Email,
                Role = dto.Role,
                TenantId = tenant?.Id
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
                // Keep the database error visible even if Supabase cleanup is unavailable.
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
        ValidateAssignableRole(dto.Role);

        var user = await BuildVisibleUsersQuery(currentUser)
            .Include(current => current.Tenant)
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("SuperAdmin users cannot be managed from this module.");
        }

        var tenant = await ResolveTenantAsync(dto.TenantId, currentUser, cancellationToken);

        user.Role = dto.Role;
        user.TenantId = tenant?.Id;
        await SyncStaffPositionsFromUserRoleAsync(user, dto.Role, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return Map(user, tenant?.Name);
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

        if (user.Role == UserRole.SuperAdmin)
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

        if (currentUser.Role == UserRole.Admin && currentUser.TenantId.HasValue)
        {
            return query.Where(user => user.TenantId == currentUser.TenantId.Value);
        }

        return query.Where(user => false);
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
            return null;
        }

        return await context.Tenants.FirstOrDefaultAsync(tenant => tenant.Id == tenantId.Value, cancellationToken)
            ?? throw new InvalidOperationException("Selected tenant was not found.");
    }

    private static void ValidateAssignableRole(UserRole role)
    {
        if (!TenantAssignableRoles.Contains(role))
        {
            throw new InvalidOperationException("This role cannot be assigned from the users module.");
        }
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
            TenantName = tenantName ?? user.Tenant?.Name,
            CreatedAt = user.CreatedAt
        };
    }

    private async Task SyncStaffPositionsFromUserRoleAsync(
        User user,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var syncedPosition = StaffRoleSync.ToStaffPosition(role);

        if (syncedPosition is null)
        {
            return;
        }

        var staffAssignments = await context.Staff
            .Where(staff => staff.UserId == user.Id)
            .ToListAsync(cancellationToken);

        foreach (var staffAssignment in staffAssignments)
        {
            staffAssignment.Position = syncedPosition.Value;
        }
    }
}
