using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.ToTable("restaurants");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_restaurants_tenant_id");

        builder.Property(e => e.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Location)
               .HasMaxLength(255)
               .IsRequired();

        // Tenant relationship
        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.Restaurants)
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        // Owner relationship
        builder.HasOne(e => e.Owner)
               .WithMany(u => u.RestaurantOwners)
               .HasForeignKey(e => e.OwnerId)
               .OnDelete(DeleteBehavior.SetNull);

        // Manager relationship
        builder.HasOne(e => e.Manager)
               .WithMany(u => u.RestaurantManagers)
               .HasForeignKey(e => e.ManagerId)
               .OnDelete(DeleteBehavior.SetNull);

        // Collections
        builder.HasMany(e => e.Inventories)
               .WithOne(i => i.Restaurant)
               .HasForeignKey(i => i.RestaurantId);

        builder.HasMany(e => e.MenuOfRestaurants)
               .WithOne(m => m.Restaurant)
               .HasForeignKey(m => m.RestaurantId);

        builder.HasMany(e => e.PurchaseOrders)
               .WithOne(po => po.Restaurant)
               .HasForeignKey(po => po.RestaurantId);

        builder.HasMany(e => e.Reports)
               .WithOne(r => r.Restaurant)
               .HasForeignKey(r => r.RestaurantId);

        builder.HasMany(e => e.Reviews)
               .WithOne(r => r.Restaurant)
               .HasForeignKey(r => r.RestaurantId);

        builder.HasMany(e => e.Staff)
               .WithOne(s => s.Restaurant)
               .HasForeignKey(s => s.RestaurantId);

        builder.HasMany(e => e.Suppliers)
               .WithOne(s => s.Restaurant)
               .HasForeignKey(s => s.RestaurantId);

        builder.HasMany(e => e.Tables)
               .WithOne(t => t.Restaurant)
               .HasForeignKey(t => t.RestaurantId);

        builder.HasIndex(e => new { e.TenantId, e.Name })
       .IsUnique()
       .HasDatabaseName("uq_tenant_restaurant_name");
    }
}