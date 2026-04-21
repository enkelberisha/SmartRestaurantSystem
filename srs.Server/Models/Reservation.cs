using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Reservation
{
    public int Id { get; set; }

    public int TableId { get; set; }

    public DateOnly ReservationDate { get; set; }

    public TimeOnly ReservationTime { get; set; }

    public string Name { get; set; } = null!;

    public string? Phone { get; set; }

    public ReservationStatus Status { get; set; }

    public Table Table { get; set; } = null!;


}