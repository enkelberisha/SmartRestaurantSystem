using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public class UpdateSuperadminUserRequestDto
{
    public UserRole Role { get; set; } = UserRole.Admin;

    public Guid? TenantId { get; set; }

    public int? RestaurantId { get; set; }
}
