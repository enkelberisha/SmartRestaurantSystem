using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Table
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public int Number { get; set; }

    public int Capacity { get; set; }

    public TableStatus Status { get; set; }

    public int? AssignedStaffId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;

    public Staff? AssignedStaff { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}