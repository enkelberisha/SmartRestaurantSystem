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

        builder.Property(e => e.RecordId)
               .IsRequired();

        builder.Property(e => e.DeletedData)
       .HasColumnType("jsonb");

        builder.Property(e => e.DeletedAt)
               .HasColumnType("timestamp without time zone");

        builder.HasIndex(e => e.RecordId)
               .HasDatabaseName("idx_audit_logs_record_id");

        builder.HasIndex(e => e.TableName)
               .HasDatabaseName("idx_audit_logs_table_name");

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_audit_logs_tenant_id");

        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.AuditLogs)
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}