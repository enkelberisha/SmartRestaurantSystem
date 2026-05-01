using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Orders;
using srs.Server.Models;
using srs.Server.Models.Enums;

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
                Status = o.Status.ToString(),
                Total = o.Total
            })
            .ToListAsync();
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
            .Select(o => new OrderDto
            {
                Id = o.Id,
                TableId = o.TableId,
                Status = o.Status.ToString(),
                Total = o.Total
            })
            .FirstOrDefaultAsync();
    }

    public async Task<OrderDto> CreateAsync(CreateOrderDto dto, Guid tenantId)
    {
        var tableExists = await _context.Tables
            .AnyAsync(t =>
                t.Id == dto.TableId &&
                _context.Restaurants.Any(r =>
                    r.Id == t.RestaurantId &&
                    r.TenantId == tenantId));

        if (!tableExists)
            throw new Exception("Table not found or not in tenant");

        var order = new Order
        {
            TableId = dto.TableId,
            Status = OrderStatus.Pending,
            Total = 0
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return new OrderDto
        {
            Id = order.Id,
            TableId = order.TableId,
            Status = order.Status.ToString(),
            Total = order.Total
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