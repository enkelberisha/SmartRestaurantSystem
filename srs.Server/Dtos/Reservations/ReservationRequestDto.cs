namespace srs.Server.Dtos.Reservations;

public class ReservationRequestDto
{
    public int TableId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public DateOnly ReservationDate { get; set; }

    public TimeOnly ReservationTime { get; set; }
}
