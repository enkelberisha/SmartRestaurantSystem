using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Payments;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services.Payments;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;

    public PaymentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PaymentDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Payments
            .Where(p => _context.Orders.Any(o =>
                o.Id == p.OrderId &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId))))
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                Method = p.Method.ToString(),
                Status = p.Status.ToString(),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<PaymentDto>> GetByOrderIdAsync(int orderId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Payments
            .Where(p => p.OrderId == orderId &&
                _context.Orders.Any(o =>
                    o.Id == orderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))))
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                Method = p.Method.ToString(),
                Status = p.Status.ToString(),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PaymentDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.Payments
            .Where(p => p.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == p.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))))
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                Method = p.Method.ToString(),
                Status = p.Status.ToString(),
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PaymentDto> CreateAsync(CreatePaymentDto dto, Guid tenantId)
    {
        if (!Enum.TryParse<PaymentMethod>(dto.Method, true, out var method))
            throw new ArgumentException("Invalid payment method.");

        var orderExists = await _context.Orders
            .AnyAsync(o => o.Id == dto.OrderId &&
                _context.Tables.Any(t =>
                    t.Id == o.TableId &&
                    _context.Restaurants.Any(r =>
                        r.Id == t.RestaurantId &&
                        r.TenantId == tenantId)));

        if (!orderExists)
            throw new ArgumentException("Order not found or does not belong to this tenant.");

        var payment = new Payment
        {
            OrderId = dto.OrderId,
            Amount = dto.Amount,
            Method = method,
            Status = PaymentStatus.Pending
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return new PaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            Amount = payment.Amount,
            Method = payment.Method.ToString(),
            Status = payment.Status.ToString(),
            CreatedAt = payment.CreatedAt
        };
    }

    public async Task<bool> UpdateStatusAsync(int id, UpdatePaymentStatusDto dto, Guid tenantId)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == p.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))));

        if (payment == null)
            return false;

        if (!Enum.TryParse<PaymentStatus>(dto.Status, true, out var status))
            throw new ArgumentException("Invalid payment status.");

        if (payment.Status == PaymentStatus.Completed)
            throw new InvalidOperationException("Cannot change the status of a completed payment.");

        payment.Status = status;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.Id == id &&
                _context.Orders.Any(o =>
                    o.Id == p.OrderId &&
                    _context.Tables.Any(t =>
                        t.Id == o.TableId &&
                        _context.Restaurants.Any(r =>
                            r.Id == t.RestaurantId &&
                            r.TenantId == tenantId))));

        if (payment == null)
            return false;

        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync();

        return true;
    }
}
