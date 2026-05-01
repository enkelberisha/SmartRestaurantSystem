namespace srs.Server.Dtos.Menu;

public class MenuDto
{
    public int Id { get; set; }
    public int RestaurantId { get; set; }
    public string Name { get; set; } = null!;
}