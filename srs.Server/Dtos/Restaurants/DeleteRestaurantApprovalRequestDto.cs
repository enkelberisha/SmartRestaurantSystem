namespace srs.Server.Dtos.Restaurants;

public class DeleteRestaurantApprovalRequestDto
{
    public int RestaurantId { get; set; }
    public string AdminPassword { get; set; } = string.Empty;
}
