using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("purchase_orders", t =>
        {
            t.HasCheckConstraint("CK_purchase_orders_total", "\"Total\" >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.SupplierId)
               .HasDatabaseName("idx_purchase_orders_supplier_id");

        builder.Property(e => e.Total)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp without time zone");
            

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.PurchaseOrders)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Supplier)
               .WithMany(s => s.PurchaseOrders)
               .HasForeignKey(e => e.SupplierId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}