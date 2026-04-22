using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews", t =>
        {
            t.HasCheckConstraint("CK_reviews_rating", "\"Rating\" >= 1 AND \"Rating\" <= 5");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.RestaurantId)
               .HasDatabaseName("idx_reviews_restaurant_id");

        builder.Property(e => e.Rating)
               .IsRequired();

        builder.HasIndex(e => new { e.RestaurantId, e.UserId })
              .IsUnique();
              

        builder.Property(e => e.Comment)
        .HasMaxLength(1000);

        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Reviews)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
              .WithMany()
              .HasForeignKey(e => e.UserId)
              .OnDelete(DeleteBehavior.SetNull);

        builder.Property(e => e.CreatedAt)
        .HasColumnType("timestamp without time zone");
    }
}
