namespace srs.Server.Models;

public class Shift
{
    public int Id { get; set; }

    public int StaffId { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public Staff Staff { get; set; } = null!;
}