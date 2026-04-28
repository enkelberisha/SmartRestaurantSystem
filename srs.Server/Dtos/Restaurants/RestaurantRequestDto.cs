namespace srs.Server.Dtos.Restaurants;

//per create dhe update
public class RestaurantRequestDto 
{
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public int? OwnerId { get; set; }
    public int? ManagerId { get; set; }
}