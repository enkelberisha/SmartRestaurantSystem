using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.DiningSessions;

public class UpdateDiningSessionDto
{
    public int? TableId { get; set; }

    public string? Status { get; set; }

    [Range(1, 99)]
    public int? PartySize { get; set; }
}
