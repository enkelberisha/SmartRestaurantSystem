namespace srs.Server.Dtos.TableSessions;

public class TableSessionOrderLineDto
{
    public int Id { get; set; }
    public int MenuItemId { get; set; }
    public string Name { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
}
