using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class MenuItemFilterAssignmentConfiguration : IEntityTypeConfiguration<MenuItemFilterAssignment>
{
    public void Configure(EntityTypeBuilder<MenuItemFilterAssignment> builder)
    {
        builder.ToTable("menu_item_filter_assignments");

        builder.HasKey(e => new { e.MenuItemId, e.MenuItemFilterId });

        builder.HasIndex(e => e.MenuItemFilterId)
               .HasDatabaseName("idx_menu_item_filter_assignments_filter_id");

        builder.HasOne(e => e.MenuItem)
               .WithMany(mi => mi.FilterAssignments)
               .HasForeignKey(e => e.MenuItemId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.MenuItemFilter)
               .WithMany(filter => filter.MenuItemAssignments)
               .HasForeignKey(e => e.MenuItemFilterId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
