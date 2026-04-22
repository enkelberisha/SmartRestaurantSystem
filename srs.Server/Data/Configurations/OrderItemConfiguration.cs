using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("order_items", t =>
        {
            t.HasCheckConstraint("CK_order_items_quantity", "quantity > 0");
            t.HasCheckConstraint("CK_order_items_price", "price >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.OrderId)
               .HasDatabaseName("idx_order_items_order_id");

        builder.HasIndex(e => e.MenuItemId)
               .HasDatabaseName("idx_order_items_menu_item_id");

        builder.Property(e => e.Quantity)
               .IsRequired();

        builder.Property(e => e.Price)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.HasOne(e => e.Order)
               .WithMany(o => o.OrderItems)
               .HasForeignKey(e => e.OrderId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.MenuItem)
               .WithMany(mi => mi.OrderItems)
               .HasForeignKey(e => e.MenuItemId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
