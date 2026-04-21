using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name)
               .HasMaxLength(150)
               .IsRequired();

        builder.Property(e => e.IsActive)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp without time zone");

        builder.HasMany(e => e.Users)
               .WithOne(u => u.Tenant)
               .HasForeignKey(u => u.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Restaurants)
               .WithOne(r => r.Tenant)
               .HasForeignKey(r => r.TenantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.AuditLogs)
               .WithOne(a => a.Tenant)
               .HasForeignKey(a => a.TenantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}