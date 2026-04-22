using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("reports");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Type)
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.CreatedAt)
               .HasColumnType("timestamp without time zone");

        builder.Property(e => e.Message)
    .IsRequired()
    .HasMaxLength(1000);


        builder.HasOne(e => e.Restaurant)
               .WithMany(r => r.Reports)
               .HasForeignKey(e => e.RestaurantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
