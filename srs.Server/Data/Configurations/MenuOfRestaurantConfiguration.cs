using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class MenuOfRestaurantConfiguration : IEntityTypeConfiguration<MenuOfRestaurant>
{
    public void Configure(EntityTypeBuilder<MenuOfRestaurant> builder)
    {
        builder.ToTable("menu_of_restaurant");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_menu_restaurant_id");

        builder.HasIndex(e => new { e.RestaurantId, e.Name })
       .IsUnique()
       .HasDatabaseName("uq_menu_restaurant_name");

        builder.Property(e => e.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.MenuOfRestaurants)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.MenuItems)
               .WithOne(mi => mi.Menu)
               .HasForeignKey(mi => mi.MenuId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}