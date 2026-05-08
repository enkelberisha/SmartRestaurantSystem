using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.TableSessions;

public class CreateTableSessionOrderLineDto
{
    [Required]
    public int MenuItemId { get; set; }

    [Range(1, 99)]
    public int Quantity { get; set; }
}
