namespace srs.Server.Models;

public class Restaurant
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = null!;

    public string Location { get; set; } = null!;

    public int? OwnerId { get; set; }

    public int? ManagerId { get; set; }

    public Tenant Tenant { get; set; } = null!;

    public User? Owner { get; set; }

    public User? Manager { get; set; }

    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();

    public ICollection<MenuOfRestaurant> MenuOfRestaurants { get; set; } = new List<MenuOfRestaurant>();

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();

    public ICollection<Report> Reports { get; set; } = new List<Report>();

    public ICollection<Review> Reviews { get; set; } = new List<Review>();

    public ICollection<Staff> Staff { get; set; } = new List<Staff>();

    public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();

    public ICollection<Table> Tables { get; set; } = new List<Table>();
}