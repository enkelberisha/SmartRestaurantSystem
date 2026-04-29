using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Superadmin;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Supabase;

namespace srs.Server.Services.Superadmin;

public class SuperadminUserService(AppDbContext context, ISupabaseAdminService supabaseAdminService) : ISuperadminUserService
{
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
                user.TenantId,
                user.Tenant != null ? user.Tenant.Name : null,
                user.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<SuperadminUserDto> CreateAsync(CreateSuperadminUserRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(dto.Role) || dto.Role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("Only tenant-scoped roles can be created from this screen.");
        }

        if (await context.Users.AnyAsync(user => user.Email == dto.Email, cancellationToken))
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        Tenant? tenant = null;
        if (dto.TenantId.HasValue)
        {
            tenant = await context.Tenants.FirstOrDefaultAsync(current => current.Id == dto.TenantId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Selected tenant was not found.");
        }

        var created = await supabaseAdminService.CreateUserAsync(dto.Email.Trim(), dto.Password, cancellationToken);

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

            return new SuperadminUserDto(
                user.Id,
                user.SupabaseUserId,
                user.Email,
                user.Role,
                user.TenantId,
                tenant?.Name,
                user.CreatedAt);
        }
        catch
        {
            await supabaseAdminService.DeleteUserAsync(created.Id, cancellationToken);
            throw;
        }
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

        user.Role = dto.Role;
        await context.SaveChangesAsync(cancellationToken);

        return new SuperadminUserDto(
            user.Id,
            user.SupabaseUserId,
            user.Email,
            user.Role,
            user.TenantId,
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
}
