namespace srs.Server.Dtos.Restaurants;

public class CreateRestaurantApprovalRequestDto
{
    public RestaurantRequestDto Restaurant { get; set; } = new();
    public List<RestaurantAccountRequestDto> Accounts { get; set; } = [];
}
