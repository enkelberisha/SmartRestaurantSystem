using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.TableSessions;

public class CreateTableSessionOrderDto
{
    [Required]
    [MinLength(1)]
    public List<CreateTableSessionOrderLineDto> Lines { get; set; } = [];
}
