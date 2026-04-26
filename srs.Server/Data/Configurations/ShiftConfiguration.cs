using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.ToTable("shifts", t =>
        {
            t.HasCheckConstraint("CK_shifts_time", "\"EndTime\" > \"StartTime\"");
        });

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.StaffId)
               .HasDatabaseName("idx_shifts_staff_id");

        builder.Property(e => e.StartTime)
               .HasColumnType("timestamp with time zone")
               .IsRequired();

        builder.Property(e => e.EndTime)
               .HasColumnType("timestamp with time zone")
               .IsRequired();

        builder.HasOne(e => e.Staff)
               .WithMany(s => s.Shifts)
               .HasForeignKey(e => e.StaffId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
