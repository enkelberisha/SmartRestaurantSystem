using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.UserId)
               .HasDatabaseName("idx_notifications_user_id");

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp with time zone");

        builder.Property(e => e.Message)
               .IsRequired();

        builder.Property(e => e.IsRead)
               .HasDefaultValue(false);

        builder.HasOne(e => e.User)
               .WithMany(u => u.Notifications)
               .HasForeignKey(e => e.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
