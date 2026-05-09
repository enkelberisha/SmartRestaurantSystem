namespace srs.Server.Models;

public class MenuItemFilterAssignment
{
    public int MenuItemId { get; set; }

    public int MenuItemFilterId { get; set; }

    public MenuItem MenuItem { get; set; } = null!;

    public MenuItemFilter MenuItemFilter { get; set; } = null!;
}
