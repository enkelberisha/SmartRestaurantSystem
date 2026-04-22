using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.ToTable("inventory_items", t =>
        {
            t.HasCheckConstraint("CK_inventory_items_quantity", "\"Quantity\" >= 0");
            t.HasCheckConstraint("CK_inventory_items_unit_price", "\"UnitPrice\" >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ItemName)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Quantity)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.Property(e => e.UnitPrice)
               .HasPrecision(10, 2)
               .IsRequired();


        builder.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone");
    

        builder.HasIndex(e => e.InventoryId)
               .HasDatabaseName("idx_inventory_items_inventory_id");

        builder.HasIndex(e => e.SupplierId)
               .HasDatabaseName("idx_inventory_items_supplier_id");

        builder.HasOne(e => e.Inventory)
               .WithMany(i => i.InventoryItems)
               .HasForeignKey(e => e.InventoryId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Supplier)
               .WithMany(s => s.InventoryItems)
               .HasForeignKey(e => e.SupplierId)
               .OnDelete(DeleteBehavior.SetNull);

        
    }
}