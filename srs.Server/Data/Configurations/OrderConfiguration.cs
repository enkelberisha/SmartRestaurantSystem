using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders", t =>
        {
            t.HasCheckConstraint("CK_orders_total", "\"Total\" >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TableId)
               .HasDatabaseName("idx_orders_table_id");

        builder.Property(e => e.Status)
      .HasConversion<string>()
      .HasMaxLength(50)
      .IsRequired();

        builder.Property(e => e.Total)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(e => e.Table)
               .WithMany(t => t.Orders)
               .HasForeignKey(e => e.TableId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.OrderItems)
               .WithOne(oi => oi.Order)
               .HasForeignKey(oi => oi.OrderId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.KitchenQueues)
               .WithOne(kq => kq.Order)
               .HasForeignKey(kq => kq.OrderId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Payments)
               .WithOne(p => p.Order)
               .HasForeignKey(p => p.OrderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
