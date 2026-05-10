using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class PosWaiterSessionConfiguration : IEntityTypeConfiguration<PosWaiterSession>
{
    public void Configure(EntityTypeBuilder<PosWaiterSession> builder)
    {
        builder.ToTable("pos_waiter_sessions");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.PosUserId)
               .HasDatabaseName("idx_pos_waiter_sessions_pos_user_id");

        builder.HasIndex(e => e.StaffId)
               .HasDatabaseName("idx_pos_waiter_sessions_staff_id");

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_pos_waiter_sessions_tenant_id");

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_pos_waiter_sessions_restaurant_id");

        builder.Property(e => e.OpenedAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(e => e.ExpiresAt)
               .HasColumnType("timestamp with time zone");

        builder.Property(e => e.ClosedAt)
               .HasColumnType("timestamp with time zone");

        builder.HasOne(e => e.PosUser)
               .WithMany(u => u.PosWaiterSessions)
               .HasForeignKey(e => e.PosUserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Staff)
               .WithMany(s => s.PosWaiterSessions)
               .HasForeignKey(e => e.StaffId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.PosWaiterSessions)
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.PosWaiterSessions)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
