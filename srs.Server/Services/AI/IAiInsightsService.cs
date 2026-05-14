using srs.Server.Dtos.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Services.AI;

public interface IAiInsightsService
{
    Task<AiManagerInsightsResponseDto> GenerateManagerInsightsAsync(
        AiManagerInsightsRequestDto request,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default);

    Task<AiOwnerInsightsResponseDto> GenerateOwnerInsightsAsync(
        AiOwnerInsightsRequestDto request,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default);
}
