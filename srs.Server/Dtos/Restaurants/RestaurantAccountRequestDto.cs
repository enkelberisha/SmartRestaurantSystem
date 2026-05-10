using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Restaurants;

public class RestaurantAccountRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.PosDevice;
}
