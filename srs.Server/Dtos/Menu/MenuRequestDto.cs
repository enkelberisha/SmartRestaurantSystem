using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Menu;

public class MenuRequestDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    public string Name { get; set; } = null!;
}