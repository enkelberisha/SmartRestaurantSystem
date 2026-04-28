namespace srs.Server.Dtos.Restaurants;

public class RestaurantDto
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public int? OwnerId { get; set; }
    public int? ManagerId { get; set; }
}