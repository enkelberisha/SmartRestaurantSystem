namespace srs.Server.Dtos.Pos;

public class PosWaiterSessionResponseDto
{
    public int StaffId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public int RestaurantId { get; set; }

    public Guid TenantId { get; set; }

    public int SessionId { get; set; }

    public DateTime OpenedAt { get; set; }
}
