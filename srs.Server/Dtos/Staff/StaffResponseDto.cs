using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Staff;

public class StaffResponseDto
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public int RestaurantId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public StaffCredentialType CredentialType { get; set; }
}
