using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public record SuperadminUserDto(
    int Id,
    Guid SupabaseUserId,
    string Email,
    UserRole Role,
    Guid? TenantId,
    string? TenantName,
    DateTime CreatedAt
);
