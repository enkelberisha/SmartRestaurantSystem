using srs.Server.Dtos.Restaurants;
using srs.Server.Services.Auth;

namespace srs.Server.Services.Restaurants;

public interface IRestaurantApprovalRequestService
{
    Task<RestaurantApprovalRequestDto> SubmitCreateAsync(CreateRestaurantApprovalRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantApprovalRequestDto> SubmitDeleteAsync(DeleteRestaurantApprovalRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RestaurantApprovalRequestDetailDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RestaurantApprovalRequestDetailDto>> GetMineAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantApprovalRequestDetailDto?> UpdateCreateAsync(int id, CreateRestaurantApprovalRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantApprovalRequestDetailDto?> ResubmitAsync(int id, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantApprovalRequestDto?> ApproveAsync(int id, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantApprovalRequestDto?> RejectAsync(int id, string? reason, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
}
