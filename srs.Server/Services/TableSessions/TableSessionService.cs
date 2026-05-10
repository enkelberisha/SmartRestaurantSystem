using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.TableSessions;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

namespace srs.Server.Services.TableSessions;

public class TableSessionService(AppDbContext context) : ITableSessionService
{
    public async Task<TableSessionDto> CreateAsync(
        CreateTableSessionDto dto,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        if (user.TenantId is null)
        {
            throw new InvalidOperationException("User has no tenant.");
        }

        var table = await context.Tables
            .Include(t => t.Restaurant)
            .FirstOrDefaultAsync(
                t => t.Id == dto.TableId && t.Restaurant.TenantId == user.TenantId.Value,
                cancellationToken);

        if (table is null)
        {
            throw new InvalidOperationException("Table not found in this tenant.");
        }

        var existingSessions = await context.TableSessions
            .Where(session => session.TableId == table.Id && session.Status == TableSessionStatus.Active)
            .ToListAsync(cancellationToken);

        foreach (var session in existingSessions)
        {
            session.Status = TableSessionStatus.Closed;
            session.ClosedAt = DateTime.UtcNow;
        }

        var tableSession = new TableSession
        {
            TenantId = user.TenantId.Value,
            RestaurantId = table.RestaurantId,
            TableId = table.Id,
            OpenedByUserId = user.Id,
            Status = TableSessionStatus.Active,
            CreatedAt = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow
        };

        context.TableSessions.Add(tableSession);
        await context.SaveChangesAsync(cancellationToken);

        tableSession.Table = table;
        tableSession.Restaurant = table.Restaurant;

        return MapSession(tableSession);
    }

    public async Task<TableSessionDto?> GetAsync(
        Guid id,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        var session = await FindSessionAsync(id, user, cancellationToken);

        if (session is null)
        {
            return null;
        }

        session.LastSeenAt = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);

        return MapSession(session);
    }

    public async Task<TableSessionDto?> CloseAsync(
        Guid id,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        var session = await FindSessionAsync(id, user, cancellationToken);

        if (session is null)
        {
            return null;
        }

        session.Status = TableSessionStatus.Closed;
        session.ClosedAt = DateTime.UtcNow;
        session.LastSeenAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);

        return MapSession(session);
    }

    public async Task<TableSessionOrderDto> CreateOrderAsync(
        Guid id,
        CreateTableSessionOrderDto dto,
        CurrentUserContext user,
        CancellationToken cancellationToken = default)
    {
        var session = await FindSessionAsync(id, user, cancellationToken);

        if (session is null)
        {
            throw new InvalidOperationException("Table session not found.");
        }

        if (session.Status != TableSessionStatus.Active)
        {
            throw new InvalidOperationException("Table session is closed.");
        }

        var itemIds = dto.Lines.Select(line => line.MenuItemId).Distinct().ToArray();
        var menuItems = await context.MenuItems
            .Include(item => item.Menu)
            .Where(item =>
                itemIds.Contains(item.Id) &&
                item.Menu.RestaurantId == session.RestaurantId &&
                item.Menu.Restaurant.TenantId == session.TenantId)
            .ToDictionaryAsync(item => item.Id, cancellationToken);

        if (menuItems.Count != itemIds.Length)
        {
            throw new InvalidOperationException("One or more menu items are not available for this restaurant.");
        }

        var activeDiningSession = await context.DiningSessions
            .Where(diningSession =>
                diningSession.TenantId == session.TenantId &&
                diningSession.RestaurantId == session.RestaurantId &&
                diningSession.TableId == session.TableId &&
                diningSession.Status != DiningSessionStatus.Closed)
            .OrderByDescending(diningSession => diningSession.SeatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeDiningSession is not null && activeDiningSession.Status == DiningSessionStatus.Seated)
        {
            activeDiningSession.Status = DiningSessionStatus.Ordering;
        }

        var order = new Order
        {
            TableId = session.TableId,
            DiningSessionId = activeDiningSession?.Id,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var line in dto.Lines)
        {
            var menuItem = menuItems[line.MenuItemId];
            var orderItem = new OrderItem
            {
                Order = order,
                MenuItemId = menuItem.Id,
                Quantity = line.Quantity,
                Price = menuItem.Price,
                Notes = string.IsNullOrWhiteSpace(line.Notes) ? null : line.Notes.Trim()
            };

            order.OrderItems.Add(orderItem);
            order.Total += orderItem.Price * orderItem.Quantity;
        }

        session.LastSeenAt = DateTime.UtcNow;
        context.Orders.Add(order);
        await context.SaveChangesAsync(cancellationToken);

        return new TableSessionOrderDto
        {
            Id = order.Id,
            TableSessionId = session.Id,
            DiningSessionId = activeDiningSession?.Id,
            TableId = session.TableId,
            TableNumber = session.Table.Number,
            Status = order.Status.ToString(),
            Total = order.Total,
            CreatedAt = order.CreatedAt,
            Lines = order.OrderItems.Select(item => new TableSessionOrderLineDto
            {
                Id = item.Id,
                MenuItemId = item.MenuItemId,
                Name = menuItems[item.MenuItemId].Name,
                Quantity = item.Quantity,
                Price = item.Price,
                Notes = item.Notes
            }).ToList()
        };
    }

    private async Task<TableSession?> FindSessionAsync(
        Guid id,
        CurrentUserContext user,
        CancellationToken cancellationToken)
    {
        if (user.TenantId is null)
        {
            return null;
        }

        return await context.TableSessions
            .Include(session => session.Restaurant)
            .Include(session => session.Table)
            .FirstOrDefaultAsync(
                session => session.Id == id && session.TenantId == user.TenantId.Value,
                cancellationToken);
    }

    private static TableSessionDto MapSession(TableSession session)
    {
        return new TableSessionDto
        {
            Id = session.Id,
            TenantId = session.TenantId,
            RestaurantId = session.RestaurantId,
            RestaurantName = session.Restaurant.Name,
            TableId = session.TableId,
            TableNumber = session.Table.Number,
            Status = session.Status.ToString(),
            CreatedAt = session.CreatedAt,
            ClosedAt = session.ClosedAt,
            LastSeenAt = session.LastSeenAt
        };
    }
}
