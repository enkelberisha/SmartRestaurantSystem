namespace srs.Server.Dtos.Tenants;

public record TenantDto(
    Guid Id,
    string Name,
    bool IsActive,
    DateTime CreatedAt,
    int UsersCount
);
