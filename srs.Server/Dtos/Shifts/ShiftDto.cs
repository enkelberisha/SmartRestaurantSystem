namespace srs.Server.Dtos.Shifts;

public class ShiftDto
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}
