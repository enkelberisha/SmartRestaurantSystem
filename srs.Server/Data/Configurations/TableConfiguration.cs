using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class TableConfiguration : IEntityTypeConfiguration<Table>
{
    public void Configure(EntityTypeBuilder<Table> builder)
    {
        builder.ToTable("tables", t =>
        {
            t.HasCheckConstraint("CK_tables_capacity", "\"Capacity\" > 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_tables_restaurant_id");

        // Unique table number per restaurant
        builder.HasIndex(e => new { e.RestaurantId, e.Number })
               .IsUnique()
               .HasDatabaseName("uq_tables_restaurant_number");

        builder.Property(e => e.Number)
               .IsRequired();

        builder.Property(e => e.Capacity)
               .IsRequired();

        builder.Property(e => e.Status)
             .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Tables)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.AssignedStaff)
               .WithMany(s => s.Tables)
               .HasForeignKey(e => e.AssignedStaffId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.Orders)
               .WithOne(o => o.Table)
               .HasForeignKey(o => o.TableId);

        builder.HasMany(e => e.Reservations)
               .WithOne(r => r.Table)
               .HasForeignKey(r => r.TableId);
    }
}