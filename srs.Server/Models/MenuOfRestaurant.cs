namespace srs.Server.Models;

public class MenuOfRestaurant
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public string Name { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;

    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
}