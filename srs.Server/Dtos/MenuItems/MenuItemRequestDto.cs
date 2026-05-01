using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.MenuItems;

public class MenuItemRequestDto
{
	[Required]
	public int MenuId { get; set; }

	[Required]
	public string Name { get; set; } = null!;

	public decimal Price { get; set; }

	public string? Description { get; set; }

	public int CookingTime { get; set; }
}