using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class MenuItemFilterConfiguration : IEntityTypeConfiguration<MenuItemFilter>
{
    public void Configure(EntityTypeBuilder<MenuItemFilter> builder)
    {
        builder.ToTable("menu_item_filters");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_menu_item_filters_tenant_id");

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_menu_item_filters_restaurant_id");

        builder.HasIndex(e => new { e.TenantId, e.Slug })
               .IsUnique()
               .HasDatabaseName("uq_menu_item_filters_tenant_slug");

        builder.Property(e => e.Name)
               .HasMaxLength(80)
               .IsRequired();

        builder.Property(e => e.Slug)
               .HasMaxLength(80)
               .IsRequired();

        builder.Property(e => e.IsActive)
               .HasDefaultValue(true)
               .IsRequired();

        builder.HasOne(e => e.Tenant)
               .WithMany()
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Restaurant)
               .WithMany()
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
