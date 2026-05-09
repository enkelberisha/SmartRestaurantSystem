using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.TableSessions;

public class CreateTableSessionDto
{
    [Required]
    public int TableId { get; set; }
}
