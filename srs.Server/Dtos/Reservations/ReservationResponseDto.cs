namespace srs.Server.Dtos.Reservations
{

    using srs.Server.Models.Enums;
    public class ReservationResponseDto
    {
        public int Id { get; set; }
        public int TableId { get; set; }
        public string Name { get; set; } = null!;
        public string? Phone { get; set; }
        public DateOnly ReservationDate { get; set; }
        public TimeOnly ReservationTime { get; set; }
        public ReservationStatus Status { get; set; }
    }
}
