using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Users;

public class UpdateUserRequestDto
{
    public UserRole Role { get; set; } = UserRole.User;

    public Guid? TenantId { get; set; }
}
