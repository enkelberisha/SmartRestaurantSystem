namespace srs.Server.Dtos.MenuItems;

public class MenuItemFilterDto
{
    public int Id { get; set; }
    public int? RestaurantId { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int SortOrder { get; set; }
}
