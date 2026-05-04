using srs.Server.Dtos.Notifications;

namespace srs.Server.Services.Notifications;

public interface INotificationService
{
    Task<List<NotificationDto>> GetByUserIdAsync(int userId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<NotificationDto?> GetByIdAsync(int id, int userId, Guid tenantId);
    Task<NotificationDto> CreateAsync(CreateNotificationDto dto, Guid tenantId);
    Task<bool> MarkAsReadAsync(int id, int userId, Guid tenantId);
    Task<int> MarkAllAsReadAsync(int userId, Guid tenantId);
    Task<bool> DeleteAsync(int id, int userId, Guid tenantId);
}
