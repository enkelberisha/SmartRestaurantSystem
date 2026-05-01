using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public class UpdateSuperadminUserRequestDto
{
    public UserRole Role { get; set; } = UserRole.User;

    public Guid? TenantId { get; set; }
}
