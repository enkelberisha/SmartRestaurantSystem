using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Reservations;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services.Reservations;

public class ReservationService(AppDbContext context) : IReservationService
{
    public async Task<ReservationResponseDto> CreateAsync(
        ReservationRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, currentId: null, cancellationToken);

        var entity = new Reservation
        {
            TableId = dto.TableId,
            Name = dto.Name.Trim(),
            Phone = NormalizeOptional(dto.Phone),
            ReservationDate = dto.ReservationDate,
            ReservationTime = dto.ReservationTime,
            Status = ReservationStatus.Pending
        };

        context.Reservations.Add(entity);
        await context.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<IReadOnlyList<ReservationResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await context.Reservations
            .AsNoTracking()
            .OrderBy(reservation => reservation.ReservationDate)
            .ThenBy(reservation => reservation.ReservationTime)
            .Select(reservation => Map(reservation))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ReservationResponseDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await context.Reservations
            .AsNoTracking()
            .Where(reservation =>
                context.Tables.Any(table =>
                    table.Id == reservation.TableId &&
                    table.RestaurantId == restaurantId &&
                    table.Restaurant.TenantId == tenantId))
            .OrderBy(reservation => reservation.ReservationDate)
            .ThenBy(reservation => reservation.ReservationTime)
            .Select(reservation => Map(reservation))
            .ToListAsync(cancellationToken);
    }

    public async Task<ReservationResponseDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await context.Reservations
            .AsNoTracking()
            .Where(reservation => reservation.Id == id)
            .Select(reservation => Map(reservation))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ReservationResponseDto?> UpdateAsync(
        int id,
        ReservationRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.Reservations.FirstOrDefaultAsync(
            reservation => reservation.Id == id,
            cancellationToken);

        if (entity is null)
        {
            return null;
        }

        await ValidateAsync(dto, id, cancellationToken);

        entity.TableId = dto.TableId;
        entity.Name = dto.Name.Trim();
        entity.Phone = NormalizeOptional(dto.Phone);
        entity.ReservationDate = dto.ReservationDate;
        entity.ReservationTime = dto.ReservationTime;

        await context.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await context.Reservations.FirstOrDefaultAsync(
            reservation => reservation.Id == id,
            cancellationToken);

        if (entity is null)
        {
            return false;
        }

        context.Reservations.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task ValidateAsync(
        ReservationRequestDto dto,
        int? currentId,
        CancellationToken cancellationToken)
    {
        if (dto.TableId <= 0)
        {
            throw new ArgumentException("Table is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        if (dto.Name.Trim().Length > 100)
        {
            throw new ArgumentException("Name cannot be longer than 100 characters.");
        }

        if (dto.ReservationDate == default)
        {
            throw new ArgumentException("Reservation date is required.");
        }

        if (dto.ReservationTime == default)
        {
            throw new ArgumentException("Reservation time is required.");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);

        if (dto.ReservationDate < today)
        {
            throw new ArgumentException("Reservation date cannot be in the past.");
        }

        if (dto.ReservationDate == today && dto.ReservationTime <= currentTime)
        {
            throw new ArgumentException("Reservation time must be in the future.");
        }

        var tableExists = await context.Tables.AnyAsync(
            table => table.Id == dto.TableId,
            cancellationToken);

        if (!tableExists)
        {
            throw new ArgumentException("Selected table was not found.");
        }

        var alreadyReserved = await context.Reservations.AnyAsync(
            reservation =>
                reservation.TableId == dto.TableId &&
                reservation.ReservationDate == dto.ReservationDate &&
                reservation.ReservationTime == dto.ReservationTime &&
                reservation.Status != ReservationStatus.Cancelled &&
                (!currentId.HasValue || reservation.Id != currentId.Value),
            cancellationToken);

        if (alreadyReserved)
        {
            throw new InvalidOperationException("This table is already reserved for that date and time.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static ReservationResponseDto Map(Reservation reservation)
    {
        return new ReservationResponseDto
        {
            Id = reservation.Id,
            TableId = reservation.TableId,
            Name = reservation.Name,
            Phone = reservation.Phone,
            ReservationDate = reservation.ReservationDate,
            ReservationTime = reservation.ReservationTime,
            Status = reservation.Status
        };
    }
}

