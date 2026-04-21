using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("suppliers");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_suppliers_restaurant_id");

        builder.Property(e => e.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Contact)
               .HasMaxLength(100);

        // Prevent duplicate supplier names per restaurant
        builder.HasIndex(e => new { e.RestaurantId, e.Name })
               .IsUnique()
               .HasDatabaseName("uq_supplier_restaurant_name");

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Suppliers)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.InventoryItems)
               .WithOne(i => i.Supplier)
               .HasForeignKey(i => i.SupplierId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.PurchaseOrders)
               .WithOne(po => po.Supplier)
               .HasForeignKey(po => po.SupplierId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}