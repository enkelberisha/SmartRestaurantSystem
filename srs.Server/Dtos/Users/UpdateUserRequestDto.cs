using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Users;

public class UpdateUserRequestDto
{
    public UserRole Role { get; set; } = UserRole.PosDevice;

    public Guid? TenantId { get; set; }

    public int? RestaurantId { get; set; }
}
