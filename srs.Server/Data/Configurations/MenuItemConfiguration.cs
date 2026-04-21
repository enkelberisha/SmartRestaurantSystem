using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.ToTable("menu_items", t =>
        {
            t.HasCheckConstraint("CK_menu_items_price", "price >= 0");
            t.HasCheckConstraint("CK_menu_items_cooking_time", "cooking_time >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.MenuId)
               .HasDatabaseName("idx_menu_items_menu_id");

        builder.Property(e => e.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Price)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.Property(e => e.Description);

        builder.Property(e => e.CookingTime)
               .IsRequired();

        builder.HasOne(e => e.Menu)
               .WithMany(m => m.MenuItems)
               .HasForeignKey(e => e.MenuId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.OrderItems)
               .WithOne(oi => oi.MenuItem)
               .HasForeignKey(oi => oi.MenuItemId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}