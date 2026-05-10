using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Orders;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

namespace srs.Server.Services.Orders;

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;

    public OrderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrderDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.Orders
            .Where(o =>
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)))
            .Select(o => new OrderDto
            {
                Id = o.Id,
                TableId = o.TableId,
                DiningSessionId = o.DiningSessionId,
                WaiterStaffId = o.WaiterStaffId,
                PosUserId = o.PosUserId,
                Status = o.Status.ToString(),
                Total = o.Total,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<OrderDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Orders
            .Where(o =>
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    t.RestaurantId == restaurantId &&
                    _context.Restaurants.Any(r =>
                        r.Id == restaurantId &&
                        r.TenantId == tenantId)))
            .Select(o => new OrderDto
            {
                Id = o.Id,
                TableId = o.TableId,
                DiningSessionId = o.DiningSessionId,
                WaiterStaffId = o.WaiterStaffId,
                PosUserId = o.PosUserId,
                Status = o.Status.ToString(),
                Total = o.Total,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<OrderDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.Orders
            .Where(o => o.Id == id &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)))
            .OrderBy(o => o.Id)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                TableId = o.TableId,
                DiningSessionId = o.DiningSessionId,
                WaiterStaffId = o.WaiterStaffId,
                PosUserId = o.PosUserId,
                Status = o.Status.ToString(),
                Total = o.Total,
                CreatedAt = o.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<OrderDto> CreateAsync(
        CreateOrderDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("No tenant");
        var table = await _context.Tables
            .AsNoTracking()
            .FirstOrDefaultAsync(t =>
                t.Id == dto.TableId &&
                _context.Restaurants.Any(r =>
                    r.Id == t.RestaurantId &&
                    r.TenantId == tenantId), cancellationToken);

        if (table is null)
            throw new Exception("Table not found or not in tenant");

        if (currentUser.Role == UserRole.PosDevice && currentUser.RestaurantId != table.RestaurantId)
            throw new InvalidOperationException("POS device cannot create orders for another restaurant.");

        var diningSessionId = dto.DiningSessionId;

        if (diningSessionId.HasValue)
        {
            var diningSessionExists = await _context.DiningSessions.AnyAsync(ds =>
                ds.Id == diningSessionId.Value &&
                ds.TableId == dto.TableId &&
                ds.TenantId == tenantId, cancellationToken);

            if (!diningSessionExists)
                throw new Exception("Dining session not found for this table");
        }
        else
        {
            diningSessionId = await _context.DiningSessions
                .Where(ds =>
                    ds.TableId == dto.TableId &&
                    ds.TenantId == tenantId &&
                    ds.Status != DiningSessionStatus.Closed)
                .OrderByDescending(ds => ds.SeatedAt)
                .Select(ds => (int?)ds.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        int? waiterStaffId = null;
        int? posUserId = null;

        if (currentUser.Role == UserRole.PosDevice)
        {
            posUserId = currentUser.Id;
            waiterStaffId = await _context.PosWaiterSessions
                .Where(session =>
                    session.PosUserId == currentUser.Id &&
                    session.TenantId == tenantId &&
                    session.RestaurantId == table.RestaurantId &&
                    session.ClosedAt == null &&
                    (session.ExpiresAt == null || session.ExpiresAt > DateTime.UtcNow))
                .OrderByDescending(session => session.OpenedAt)
                .Select(session => (int?)session.StaffId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var order = new Order
        {
            TableId = dto.TableId,
            DiningSessionId = diningSessionId,
            WaiterStaffId = waiterStaffId,
            PosUserId = posUserId,
            Status = OrderStatus.Pending,
            Total = 0
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        return new OrderDto
        {
            Id = order.Id,
            TableId = order.TableId,
            DiningSessionId = order.DiningSessionId,
            WaiterStaffId = order.WaiterStaffId,
            PosUserId = order.PosUserId,
            Status = order.Status.ToString(),
            Total = order.Total,
            CreatedAt = order.CreatedAt
        };
    }

    public async Task<bool> UpdateStatusAsync(int id, UpdateOrderStatusDto dto, Guid tenantId)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == id &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)));

        if (order == null)
            return false;

        if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var status))
            throw new Exception("Invalid status");

        // optional: prevent changing completed orders
        if (order.Status == OrderStatus.Completed)
            throw new Exception("Cannot change completed order");

        order.Status = status;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == id &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)));

        if (order == null)
            return false;

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return true;
    }
}

