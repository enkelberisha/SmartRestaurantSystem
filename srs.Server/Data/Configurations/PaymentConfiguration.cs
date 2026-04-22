using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments", t =>
        {
            t.HasCheckConstraint("CK_payments_amount", "\"Amount\" >= 0");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.OrderId)
               .HasDatabaseName("idx_payments_order_id");

        builder.Property(e => e.Amount)
               .HasPrecision(10, 2)
               .IsRequired();

        builder.Property(e => e.Method)
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.Status)
               .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.HasOne(e => e.Order)
               .WithMany(o => o.Payments)
               .HasForeignKey(e => e.OrderId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone");
    }
}
