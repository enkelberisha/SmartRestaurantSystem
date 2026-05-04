using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Notifications;
using srs.Server.Models;

namespace srs.Server.Services.Notifications;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<NotificationDto>> GetByUserIdAsync(int userId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId && n.User.TenantId == tenantId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => Map(n))
            .ToListAsync(cancellationToken);
    }

    public async Task<NotificationDto?> GetByIdAsync(int id, int userId, Guid tenantId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.User.TenantId == tenantId);

        return notification == null ? null : Map(notification);
    }

    public async Task<NotificationDto> CreateAsync(CreateNotificationDto dto, Guid tenantId)
    {
        var userExists = await _context.Users
            .AnyAsync(u => u.Id == dto.UserId && u.TenantId == tenantId);

        if (!userExists)
            throw new ArgumentException("User not found or does not belong to this tenant.");

        var notification = new Notification
        {
            UserId = dto.UserId,
            Message = dto.Message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        return Map(notification);
    }

    public async Task<bool> MarkAsReadAsync(int id, int userId, Guid tenantId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.User.TenantId == tenantId);

        if (notification == null)
            return false;

        notification.IsRead = true;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> MarkAllAsReadAsync(int userId, Guid tenantId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && n.User.TenantId == tenantId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
            notification.IsRead = true;

        await _context.SaveChangesAsync();
        return notifications.Count;
    }

    public async Task<bool> DeleteAsync(int id, int userId, Guid tenantId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && n.User.TenantId == tenantId);

        if (notification == null)
            return false;

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return true;
    }

    private static NotificationDto Map(Notification n) => new()
    {
        Id = n.Id,
        UserId = n.UserId,
        Message = n.Message,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt
    };
}
