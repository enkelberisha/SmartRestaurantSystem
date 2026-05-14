using srs.Server.Dtos.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Services.AI;

public interface IAiManagerInsightsJobService
{
    AiManagerInsightsJobDto StartManagerInsightsJob(AiManagerInsightsRequestDto request, CurrentUserContext currentUser);
    AiManagerInsightsJobDto? GetManagerInsightsJob(Guid jobId, CurrentUserContext currentUser);
    AiManagerInsightsJobDto? GetLatestManagerInsightsJob(AiManagerInsightsRequestDto request, CurrentUserContext currentUser);
}
