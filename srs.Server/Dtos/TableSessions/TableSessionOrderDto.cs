namespace srs.Server.Dtos.TableSessions;

public class TableSessionOrderDto
{
    public int Id { get; set; }
    public Guid TableSessionId { get; set; }
    public int TableId { get; set; }
    public int TableNumber { get; set; }
    public string Status { get; set; } = null!;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<TableSessionOrderLineDto> Lines { get; set; } = [];
}
