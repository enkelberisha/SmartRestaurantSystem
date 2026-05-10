using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public record SuperadminUserDto(
    int Id,
    Guid SupabaseUserId,
    string Email,
    UserRole Role,
    bool IsActivated,
    Guid? TenantId,
    int? RestaurantId,
    string? TenantName,
    DateTime CreatedAt);
