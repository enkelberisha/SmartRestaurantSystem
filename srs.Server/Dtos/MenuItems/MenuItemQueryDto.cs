namespace srs.Server.Dtos.MenuItems;

public class MenuItemQueryDto
{
    public string? Search { get; set; }

    public List<string> Filters { get; set; } = [];
}
