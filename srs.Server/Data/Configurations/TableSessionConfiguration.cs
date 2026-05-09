using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class TableSessionConfiguration : IEntityTypeConfiguration<TableSession>
{
    public void Configure(EntityTypeBuilder<TableSession> builder)
    {
        builder.ToTable("table_sessions");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_table_sessions_tenant_id");

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_table_sessions_restaurant_id");

        builder.HasIndex(e => e.TableId)
               .HasDatabaseName("idx_table_sessions_table_id");

        builder.HasIndex(e => new { e.TableId, e.Status })
               .HasDatabaseName("idx_table_sessions_table_status");

        builder.Property(e => e.Status)
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(e => e.ClosedAt)
               .HasColumnType("timestamp with time zone");

        builder.Property(e => e.LastSeenAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(e => e.Tenant)
               .WithMany()
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.TableSessions)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Table)
               .WithMany(t => t.TableSessions)
               .HasForeignKey(e => e.TableId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.OpenedByUser)
               .WithMany()
               .HasForeignKey(e => e.OpenedByUserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
