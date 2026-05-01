namespace srs.Server.Dtos.MenuItems;

public class MenuItemDto
{
    public int Id { get; set; }
    public int MenuId { get; set; }
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public int CookingTime { get; set; }
}