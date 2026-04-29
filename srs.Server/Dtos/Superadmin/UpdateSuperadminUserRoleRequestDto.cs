using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public class UpdateSuperadminUserRoleRequestDto
{
    public UserRole Role { get; set; }
}
