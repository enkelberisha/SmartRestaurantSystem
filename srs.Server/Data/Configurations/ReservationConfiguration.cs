using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("reservations");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.TableId)
               .HasDatabaseName("idx_reservations_table_id");

        builder.Property(e => e.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(e => e.Status)
              .HasConversion<string>()
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.ReservationDate)
               .IsRequired();

        builder.Property(e => e.ReservationTime)
               .IsRequired();

        builder.HasOne(e => e.Table)
               .WithMany(t => t.Reservations)
               .HasForeignKey(e => e.TableId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.TableId, e.ReservationDate, e.ReservationTime })
       .IsUnique()
       .HasDatabaseName("uq_table_reservation_time");
    }
}