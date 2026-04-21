using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class InventoryConfiguration : IEntityTypeConfiguration<Inventory>
{
    public void Configure(EntityTypeBuilder<Inventory> builder)
    {
        builder.ToTable("inventory");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_inventory_restaurant_id");

        builder.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone");

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Inventories)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}