using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Tenants;

public record TenantMemberDto(
    int Id,
    Guid SupabaseUserId,
    string Email,
    UserRole Role,
    DateTime CreatedAt
);
