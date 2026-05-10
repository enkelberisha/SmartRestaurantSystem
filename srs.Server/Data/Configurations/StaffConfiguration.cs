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

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_staff_tenant_id");

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_staff_restaurant_id");

        builder.Property(e => e.FullName)
               .HasMaxLength(150)
               .IsRequired();

        builder.Property(e => e.CredentialHash)
               .HasMaxLength(200)
               .IsRequired();

        builder.Property(e => e.CredentialType)
                .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasIndex(e => new { e.RestaurantId, e.CredentialHash })
               .IsUnique()
               .HasDatabaseName("uq_staff_restaurant_credential");

        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.Staff)
               .HasForeignKey(e => e.TenantId)
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

        builder.HasMany(e => e.Orders)
               .WithOne(o => o.WaiterStaff)
               .HasForeignKey(o => o.WaiterStaffId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.PosWaiterSessions)
               .WithOne(s => s.Staff)
               .HasForeignKey(s => s.StaffId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
