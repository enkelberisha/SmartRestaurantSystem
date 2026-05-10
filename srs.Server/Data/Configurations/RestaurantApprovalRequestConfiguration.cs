using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class RestaurantApprovalRequestConfiguration : IEntityTypeConfiguration<RestaurantApprovalRequest>
{
    public void Configure(EntityTypeBuilder<RestaurantApprovalRequest> builder)
    {
        builder.ToTable("restaurant_approval_requests");

        builder.HasKey(request => request.Id);

        builder.Property(request => request.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(request => request.Status)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(request => request.Summary)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(request => request.ProtectedPayload)
            .IsRequired();

        builder.Property(request => request.AdminPasswordConfirmation)
            .HasMaxLength(120);

        builder.Property(request => request.RejectionReason)
            .HasMaxLength(500);

        builder.Property(request => request.CreatedAt)
            .HasColumnType("timestamp with time zone");

        builder.Property(request => request.ReviewedAt)
            .HasColumnType("timestamp with time zone");

        builder.HasOne(request => request.Tenant)
            .WithMany()
            .HasForeignKey(request => request.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(request => request.RequestedByUser)
            .WithMany()
            .HasForeignKey(request => request.RequestedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(request => request.ReviewedByUser)
            .WithMany()
            .HasForeignKey(request => request.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(request => request.Restaurant)
            .WithMany()
            .HasForeignKey(request => request.RestaurantId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
