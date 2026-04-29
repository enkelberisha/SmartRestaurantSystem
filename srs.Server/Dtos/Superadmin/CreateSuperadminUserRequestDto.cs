using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Superadmin;

public class CreateSuperadminUserRequestDto
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;

    public Guid? TenantId { get; set; }
}
