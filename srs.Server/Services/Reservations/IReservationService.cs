using srs.Server.Dtos.Reservations;

namespace srs.Server.Services.Reservations;

public interface IReservationService
{
    Task<ReservationResponseDto> CreateAsync(ReservationRequestDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReservationResponseDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ReservationResponseDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ReservationResponseDto?> UpdateAsync(int id, ReservationRequestDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
