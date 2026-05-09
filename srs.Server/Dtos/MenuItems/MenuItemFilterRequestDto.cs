using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.MenuItems;

public class MenuItemFilterRequestDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = null!;

    public int SortOrder { get; set; }
}
