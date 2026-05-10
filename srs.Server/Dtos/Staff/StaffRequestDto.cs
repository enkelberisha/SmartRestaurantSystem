using srs.Server.Models.Enums;

namespace srs.Server.Dtos.Staff;

public class StaffRequestDto
{
    public int RestaurantId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string CredentialValue { get; set; } = string.Empty;

    public StaffCredentialType CredentialType { get; set; } = StaffCredentialType.Pin;

    public bool IsActive { get; set; } = true;
}
