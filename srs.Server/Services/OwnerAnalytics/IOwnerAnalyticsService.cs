using srs.Server.Dtos.OwnerAnalytics;

namespace srs.Server.Services.OwnerAnalytics;

public interface IOwnerAnalyticsService
{
    Task<OwnerAnalyticsResponseDto> GetAsync(
        Guid tenantId,
        int? restaurantId,
        CancellationToken cancellationToken = default);
}
