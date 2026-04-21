using Microsoft.EntityFrameworkCore;
using srs.Server.Models;

namespace srs.Server.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }
    public virtual DbSet<Inventory> Inventories { get; set; }
    public virtual DbSet<InventoryItem> InventoryItems { get; set; }
    public virtual DbSet<KitchenQueue> KitchenQueues { get; set; }
    public virtual DbSet<MenuItem> MenuItems { get; set; }
    public virtual DbSet<MenuOfRestaurant> MenuOfRestaurants { get; set; }
    public virtual DbSet<Notification> Notifications { get; set; }
    public virtual DbSet<Order> Orders { get; set; }
    public virtual DbSet<OrderItem> OrderItems { get; set; }
    public virtual DbSet<Payment> Payments { get; set; }
    public virtual DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public virtual DbSet<Report> Reports { get; set; }
    public virtual DbSet<Reservation> Reservations { get; set; }
    public virtual DbSet<Restaurant> Restaurants { get; set; }
    public virtual DbSet<Review> Reviews { get; set; }
    public virtual DbSet<Shift> Shifts { get; set; }
    public virtual DbSet<Staff> Staff { get; set; }
    public virtual DbSet<Supplier> Suppliers { get; set; }
    public virtual DbSet<Table> Tables { get; set; }
    public virtual DbSet<Tenant> Tenants { get; set; }
    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}