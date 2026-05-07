using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Shifts;

public class UpdateShiftDto
{
    [Required]
    public DateTime StartTime { get; set; }

    [Required]
    public DateTime EndTime { get; set; }
}
