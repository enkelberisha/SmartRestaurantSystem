using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Users;

public class UserResponseDto
{
    public int Id { get; set; }

    public Guid SupabaseUserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public Guid? TenantId { get; set; }

    public int? RestaurantId { get; set; }

    public string? TenantName { get; set; }

    public DateTime CreatedAt { get; set; }
}
