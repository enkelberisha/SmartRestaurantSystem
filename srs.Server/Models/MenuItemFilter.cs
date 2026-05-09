namespace srs.Server.Models;

public class MenuItemFilter
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public int? RestaurantId { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;

    public Restaurant? Restaurant { get; set; }

    public ICollection<MenuItemFilterAssignment> MenuItemAssignments { get; set; } = new List<MenuItemFilterAssignment>();
}
