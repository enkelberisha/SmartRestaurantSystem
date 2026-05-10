using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Users;

public class CreateUserRequestDto
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.PosDevice;

    public Guid? TenantId { get; set; }

    public int? RestaurantId { get; set; }
}
