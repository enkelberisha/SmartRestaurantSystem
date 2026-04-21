namespace srs.Server.Models;

public class MenuItem
{
    public int Id { get; set; }

    public int MenuId { get; set; }

    public string Name { get; set; } = null!;

    public decimal Price { get; set; }

    public string? Description { get; set; }

    public int CookingTime { get; set; }

    public MenuOfRestaurant Menu { get; set; } = null!;

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}