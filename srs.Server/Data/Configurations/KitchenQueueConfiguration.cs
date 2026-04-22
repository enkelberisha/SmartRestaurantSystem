using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using srs.Server.Models;

namespace srs.Server.Data.Configurations;

public class KitchenQueueConfiguration : IEntityTypeConfiguration<KitchenQueue>
{
    public void Configure(EntityTypeBuilder<KitchenQueue> builder)
    {
        builder.ToTable("kitchen_queue");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => e.OrderId)
               .HasDatabaseName("idx_kitchen_queue_order_id");

        builder.Property(e => e.UpdatedAt)
          .HasColumnType("timestamp without time zone");



        builder.HasOne(e => e.Order)
               .WithMany(o => o.KitchenQueues)
               .HasForeignKey(e => e.OrderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
