using srs.Server.Dtos.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Services.AI;

public interface IAiOwnerInsightsJobService
{
    AiOwnerInsightsJobDto StartOwnerInsightsJob(AiOwnerInsightsRequestDto request, CurrentUserContext currentUser);
    AiOwnerInsightsJobDto? GetOwnerInsightsJob(Guid jobId, CurrentUserContext currentUser);
    AiOwnerInsightsJobDto? GetLatestOwnerInsightsJob(AiOwnerInsightsRequestDto request, CurrentUserContext currentUser);
}
