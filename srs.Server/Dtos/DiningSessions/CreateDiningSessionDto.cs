using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.DiningSessions;

public class CreateDiningSessionDto
{
    [Required]
    public int TableId { get; set; }

    [Range(1, 99)]
    public int PartySize { get; set; }
}
