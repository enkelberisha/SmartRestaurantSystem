using srs.Server.Models.Enums;

namespace srs.Server.Services.Auth;

public sealed record CurrentUserContext(
    int Id,
    Guid SupabaseUserId,
    string Email,
    UserRole Role,
    Guid? TenantId,
    int? RestaurantId
);
