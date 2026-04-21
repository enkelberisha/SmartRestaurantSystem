using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Staff
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int RestaurantId { get; set; }

    public StaffPosition Position { get; set; }
    public User User { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;

    public ICollection<Shift> Shifts { get; set; } = new List<Shift>();

    public ICollection<Table> Tables { get; set; } = new List<Table>();
}