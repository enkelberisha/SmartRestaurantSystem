namespace srs.Server.Dtos.Restaurants;

public record SystemRestaurantDto(
    int Id,
    Guid TenantId,
    string TenantName,
    string Name,
    string Location,
    int? OwnerId,
    int? ManagerId
);
