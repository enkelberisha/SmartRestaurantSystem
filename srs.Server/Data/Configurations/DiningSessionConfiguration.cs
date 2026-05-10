using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class DiningSessionConfiguration : IEntityTypeConfiguration<DiningSession>
{
    public void Configure(EntityTypeBuilder<DiningSession> builder)
    {
        builder.ToTable("dining_sessions", t =>
        {
            t.HasCheckConstraint("CK_dining_sessions_party_size", "\"PartySize\" > 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_dining_sessions_tenant_id");

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_dining_sessions_restaurant_id");

        builder.HasIndex(e => e.TableId)
               .HasDatabaseName("idx_dining_sessions_table_id");

        builder.HasIndex(e => new { e.TableId, e.Status })
               .HasDatabaseName("idx_dining_sessions_table_status");

        builder.Property(e => e.Status)
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.SeatedAt)
               .HasColumnType("timestamp with time zone")
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(e => e.ClosedAt)
               .HasColumnType("timestamp with time zone");

        builder.HasOne(e => e.Tenant)
               .WithMany()
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.DiningSessions)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Table)
               .WithMany(t => t.DiningSessions)
               .HasForeignKey(e => e.TableId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.OpenedByUser)
               .WithMany()
               .HasForeignKey(e => e.OpenedByUserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
