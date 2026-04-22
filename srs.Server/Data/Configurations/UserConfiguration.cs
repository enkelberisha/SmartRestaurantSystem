using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", t =>
        {
            t.HasCheckConstraint("CK_users_role",
    "\"Role\" IN ('Owner','Manager','User','SuperAdmin','Admin')");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TenantId)
               .HasDatabaseName("idx_users_tenant_id");

        builder.HasIndex(e => e.Email)
               .IsUnique()
               .HasDatabaseName("users_email_key");

        builder.Property(e => e.Email)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.PasswordHash)
               .IsRequired();

        builder.Property(e => e.PasswordSalt)
               .IsRequired();

        builder.Property(e => e.Role)
            .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp without time zone");
               

        builder.HasOne(e => e.Tenant)
               .WithMany(t => t.Users)
               .HasForeignKey(e => e.TenantId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.Notifications)
               .WithOne(n => n.User)
               .HasForeignKey(n => n.UserId);

        builder.HasMany(e => e.Staff)
               .WithOne(s => s.User)
               .HasForeignKey(s => s.UserId);

        builder.HasMany(e => e.RestaurantOwners)
               .WithOne(r => r.Owner)
               .HasForeignKey(r => r.OwnerId);

        builder.HasMany(e => e.RestaurantManagers)
               .WithOne(r => r.Manager)
               .HasForeignKey(r => r.ManagerId);
    }
}