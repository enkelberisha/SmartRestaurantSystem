using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.TableName)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Action)
               .HasMaxLength(32)
               .IsRequired();

        builder.Property(e => e.ActorEmail)
               .HasMaxLength(150);

        builder.Property(e => e.ActorRole)
               .HasMaxLength(50);

        builder.Property(e => e.RecordId)
               .IsRequired();

        builder.Property(e => e.Target)
               .HasMaxLength(200)
               .IsRequired();

        builder.Property(e => e.Detail)
               .HasColumnType("jsonb");

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp with time zone");

        builder.HasIndex(e => e.RecordId)
               .HasDatabaseName("idx_audit_logs_record_id");

        builder.HasIndex(e => e.Action)
               .HasDatabaseName("idx_audit_logs_action");

        builder.HasIndex(e => e.TableName)
               .HasDatabaseName("idx_audit_logs_table_name");

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_audit_logs_tenant_id");

        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.AuditLogs)
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
