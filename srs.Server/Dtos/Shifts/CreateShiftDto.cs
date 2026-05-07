using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Shifts;

public class CreateShiftDto
{
    [Required]
    public int StaffId { get; set; }

    [Required]
    public DateTime StartTime { get; set; }

    [Required]
    public DateTime EndTime { get; set; }
}
