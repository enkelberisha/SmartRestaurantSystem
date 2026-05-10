namespace srs.Server.Dtos.Restaurants;

//per create dhe update
public class RestaurantRequestDto 
{
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public string? CuisineType { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? LogoUrl { get; set; }
    public int? OwnerId { get; set; }
    public int? ManagerId { get; set; }
}
