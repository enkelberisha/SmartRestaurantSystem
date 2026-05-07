using srs.Server.Dtos.Reviews;

namespace srs.Server.Services.Reviews;

public interface IReviewService
{
    Task<List<ReviewDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<ReviewDto>> GetByRestaurantIdAsync(int restaurantId, CancellationToken cancellationToken = default);
    Task<ReviewDto?> GetByIdAsync(int id);
    Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId, Guid tenantId);
    Task<bool> UpdateAsync(int id, UpdateReviewDto dto, int userId, Guid tenantId);
    Task<bool> DeleteAsync(int id, int? userId, Guid tenantId);
}
