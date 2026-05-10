namespace srs.Server.Dtos.Restaurants;

public class RestaurantDto
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public string? CuisineType { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? LogoUrl { get; set; }
    public int? OwnerId { get; set; }
    public int? ManagerId { get; set; }
}
