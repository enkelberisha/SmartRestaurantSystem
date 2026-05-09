using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.DiningSessions;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

namespace srs.Server.Services.DiningSessions;

public class DiningSessionService(AppDbContext context) : IDiningSessionService
{
    private static readonly DiningSessionStatus[] ActiveStatuses =
    [
        DiningSessionStatus.Seated,
        DiningSessionStatus.Ordering,
        DiningSessionStatus.Eating,
        DiningSessionStatus.BillRequested,
        DiningSessionStatus.Paid,
        DiningSessionStatus.Cleaning
    ];

    public async Task<DiningSessionDto> CreateAsync(
        CreateDiningSessionDto dto,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        if (user.TenantId is null)
        {
            throw new InvalidOperationException("User has no tenant.");
        }

        var table = await GetTableAsync(dto.TableId, user.TenantId.Value, cancellationToken);

        if (table is null)
        {
            throw new InvalidOperationException("Table not found in this tenant.");
        }

        if (table.Status == TableStatus.OutOfService)
        {
            throw new InvalidOperationException("This table is out of service.");
        }

        var tableHasActiveDiningSession = await context.DiningSessions.AnyAsync(
            session => session.TableId == dto.TableId && ActiveStatuses.Contains(session.Status),
            cancellationToken);

        if (tableHasActiveDiningSession)
        {
            throw new InvalidOperationException("This table already has an active dining session.");
        }

        var diningSession = new DiningSession
        {
            TenantId = user.TenantId.Value,
            RestaurantId = table.RestaurantId,
            TableId = table.Id,
            OpenedByUserId = user.Id,
            PartySize = dto.PartySize,
            Status = DiningSessionStatus.Seated,
            SeatedAt = DateTime.UtcNow
        };

        context.DiningSessions.Add(diningSession);
        await context.SaveChangesAsync(cancellationToken);

        diningSession.Table = table;
        return Map(diningSession);
    }

    public async Task<List<DiningSessionDto>> GetActiveAsync(
        int? restaurantId,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        if (user.TenantId is null)
        {
            return [];
        }

        return await BaseQuery(user.TenantId.Value)
            .Where(session =>
                ActiveStatuses.Contains(session.Status) &&
                (restaurantId == null || session.RestaurantId == restaurantId.Value))
            .OrderBy(session => session.Table.Number)
            .Select(session => Map(session))
            .ToListAsync(cancellationToken);
    }

    public async Task<DiningSessionDto?> GetAsync(
        int id,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        if (user.TenantId is null)
        {
            return null;
        }

        var session = await BaseQuery(user.TenantId.Value)
            .FirstOrDefaultAsync(session => session.Id == id, cancellationToken);

        return session is null ? null : Map(session);
    }

    public async Task<DiningSessionDto?> UpdateAsync(
        int id,
        UpdateDiningSessionDto dto,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        if (user.TenantId is null)
        {
            return null;
        }

        var session = await context.DiningSessions
            .Include(ds => ds.Table)
            .Include(ds => ds.Orders)
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.TenantId == user.TenantId.Value, cancellationToken);

        if (session is null)
        {
            return null;
        }

        if (dto.TableId.HasValue && dto.TableId.Value != session.TableId)
        {
            var table = await GetTableAsync(dto.TableId.Value, user.TenantId.Value, cancellationToken);

            if (table is null)
            {
                throw new InvalidOperationException("Table not found in this tenant.");
            }

            if (table.RestaurantId != session.RestaurantId)
            {
                throw new InvalidOperationException("Dining sessions can only move within the same restaurant.");
            }

            var targetHasActiveDiningSession = await context.DiningSessions.AnyAsync(
                ds => ds.Id != id && ds.TableId == table.Id && ActiveStatuses.Contains(ds.Status),
                cancellationToken);

            if (targetHasActiveDiningSession)
            {
                throw new InvalidOperationException("The target table already has an active dining session.");
            }

            session.TableId = table.Id;
            session.Table = table;

            foreach (var order in session.Orders)
            {
                order.TableId = table.Id;
            }
        }

        if (dto.PartySize.HasValue)
        {
            session.PartySize = dto.PartySize.Value;
        }

        if (dto.Status is not null)
        {
            session.Status = ParseStatus(dto.Status);

            if (session.Status == DiningSessionStatus.Closed && session.ClosedAt is null)
            {
                session.ClosedAt = DateTime.UtcNow;
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        var reloaded = await BaseQuery(user.TenantId.Value)
            .FirstAsync(ds => ds.Id == session.Id, cancellationToken);

        return Map(reloaded);
    }

    public async Task<DiningSessionDto?> CloseAsync(
        int id,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        return await UpdateAsync(
            id,
            new UpdateDiningSessionDto { Status = DiningSessionStatus.Closed.ToString() },
            user,
            cancellationToken);
    }

    private IQueryable<DiningSession> BaseQuery(Guid tenantId)
    {
        return context.DiningSessions
            .Include(session => session.Table)
            .Include(session => session.Orders)
            .Where(session => session.TenantId == tenantId);
    }

    private async Task<Table?> GetTableAsync(int tableId, Guid tenantId, CancellationToken cancellationToken)
    {
        return await context.Tables
            .Include(table => table.Restaurant)
            .FirstOrDefaultAsync(
                table => table.Id == tableId && table.Restaurant.TenantId == tenantId,
                cancellationToken);
    }

    private static DiningSessionStatus ParseStatus(string status)
    {
        if (!Enum.TryParse<DiningSessionStatus>(status, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid dining session status.");
        }

        return parsed;
    }

    private static DiningSessionDto Map(DiningSession session)
    {
        return new DiningSessionDto
        {
            Id = session.Id,
            TenantId = session.TenantId,
            RestaurantId = session.RestaurantId,
            TableId = session.TableId,
            TableNumber = session.Table.Number,
            PartySize = session.PartySize,
            Status = session.Status.ToString(),
            SeatedAt = session.SeatedAt,
            ClosedAt = session.ClosedAt,
            OpenOrderTotal = session.Orders.Sum(order => order.Total)
        };
    }
}
