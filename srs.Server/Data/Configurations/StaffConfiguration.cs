using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.ToTable("staff");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_staff_restaurant_id");

        builder.Property(e => e.Position)
                .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        
        builder.HasIndex(e => new { e.UserId, e.RestaurantId })
               .IsUnique()
               .HasDatabaseName("uq_staff_user_restaurant");

        builder.HasOne(e => e.User)
               .WithMany(u => u.Staff)
               .HasForeignKey(e => e.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Staff)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Shifts)
               .WithOne(s => s.Staff)
               .HasForeignKey(s => s.StaffId);

        builder.HasMany(e => e.Tables)
               .WithOne(t => t.AssignedStaff)
               .HasForeignKey(t => t.AssignedStaffId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}