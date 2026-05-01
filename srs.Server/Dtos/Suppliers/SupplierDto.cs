namespace srs.Server.Dtos.Suppliers;

public class SupplierDto
{
    public int Id { get; set; }
    public int RestaurantId { get; set; }
    public string Name { get; set; } = null!;
    public string? Contact { get; set; }
}