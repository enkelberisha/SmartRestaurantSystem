using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.OrderItems;
using srs.Server.Models;

namespace srs.Server.Services.OrderItems;

public class OrderItemService : IOrderItemService
{
    private readonly AppDbContext _context;

    public OrderItemService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrderItemDto>> GetAllAsync(Guid tenantId)
    {
        return await _context.OrderItems
            .Where(oi =>
                _context.Orders.Any(o =>
                    o.Id == oi.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))))
            .Select(oi => new OrderItemDto
            {
                Id = oi.Id,
                OrderId = oi.OrderId,
                MenuItemId = oi.MenuItemId,
                Quantity = oi.Quantity,
                Price = oi.Price,
                Notes = oi.Notes
            })
            .ToListAsync();
    }

    public async Task<List<OrderItemDto>> GetByRestaurantIdAsync(
        int restaurantId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await _context.OrderItems
            .Where(oi =>
                _context.Orders.Any(o =>
                    o.Id == oi.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        t.RestaurantId == restaurantId &&
                        _context.Restaurants.Any(r =>
                            r.Id == restaurantId &&
                            r.TenantId == tenantId))) &&
                _context.MenuItems.Any(mi =>
                    mi.Id == oi.MenuItemId &&
                    _context.MenuOfRestaurants.Any(m =>
                        m.Id == mi.MenuId &&
                        m.RestaurantId == restaurantId)))
            .Select(oi => new OrderItemDto
            {
                Id = oi.Id,
                OrderId = oi.OrderId,
                MenuItemId = oi.MenuItemId,
                Quantity = oi.Quantity,
                Price = oi.Price
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<OrderItemDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.OrderItems
            .Where(oi => oi.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == oi.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))))
            .OrderBy(oi => oi.Id)
            .Select(oi => new OrderItemDto
            {
                Id = oi.Id,
                OrderId = oi.OrderId,
                MenuItemId = oi.MenuItemId,
                Quantity = oi.Quantity,
                Price = oi.Price,
                Notes = oi.Notes
            })
            .FirstOrDefaultAsync();
    }

    public async Task<OrderItemDto> CreateAsync(OrderItemRequestDto dto, Guid tenantId)
    {

        var order = await _context.Orders
            .Where(o =>
                o.Id == dto.OrderId &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)))
            .Select(o => new
            {
                Entity = o,
                RestaurantId = _context.Tables
                    .Where(t => t.Id == o.TableId)
                    .Select(t => t.RestaurantId)
                    .First()
            })
            .FirstOrDefaultAsync();

        if (order == null)
            throw new Exception("Order not found or not in tenant");


        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(m =>
                m.Id == dto.MenuItemId &&
                _context.MenuOfRestaurants.Any(menu =>
                    menu.Id == m.MenuId &&
                    menu.RestaurantId == order.RestaurantId));

        if (menuItem == null)
            throw new Exception("Menu item not found for this restaurant");

        var orderItem = new OrderItem
        {
            OrderId = dto.OrderId,
            MenuItemId = dto.MenuItemId,
            Quantity = dto.Quantity,
            Price = menuItem.Price,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim()
        };

        _context.OrderItems.Add(orderItem);

      
        order.Entity.Total += orderItem.Price * orderItem.Quantity;

        await _context.SaveChangesAsync();

        return new OrderItemDto
        {
            Id = orderItem.Id,
            OrderId = orderItem.OrderId,
            MenuItemId = orderItem.MenuItemId,
            Quantity = orderItem.Quantity,
            Price = orderItem.Price,
            Notes = orderItem.Notes
        };
    }

    public async Task<bool> UpdateAsync(int id, OrderItemRequestDto dto, Guid tenantId)
    {
        var orderItem = await _context.OrderItems
            .FirstOrDefaultAsync(oi => oi.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == oi.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))));

        if (orderItem == null)
            return false;

        var order = await _context.Orders.FindAsync(orderItem.OrderId);

       
        order!.Total -= orderItem.Price * orderItem.Quantity;

      
        orderItem.Quantity = dto.Quantity;
        orderItem.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

       
        order.Total += orderItem.Price * orderItem.Quantity;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var orderItem = await _context.OrderItems
            .FirstOrDefaultAsync(oi => oi.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == oi.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))));

        if (orderItem == null)
            return false;

        var order = await _context.Orders.FindAsync(orderItem.OrderId);

       
        order!.Total -= orderItem.Price * orderItem.Quantity;

        _context.OrderItems.Remove(orderItem);
        await _context.SaveChangesAsync();

        return true;
    }
}
