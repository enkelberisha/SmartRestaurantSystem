using System.Collections.Concurrent;
using System.Threading.Channels;
using srs.Server.Dtos.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Services.AI;

public class AiManagerInsightsJobService(
    IServiceScopeFactory serviceScopeFactory,
    ILogger<AiManagerInsightsJobService> logger) : BackgroundService, IAiManagerInsightsJobService
{
    private readonly Channel<Guid> _queue = Channel.CreateUnbounded<Guid>();
    private readonly ConcurrentDictionary<Guid, ManagerAiJobState> _jobs = new();
    private readonly ConcurrentDictionary<string, Guid> _latestJobByScope = new();

    public AiManagerInsightsJobDto StartManagerInsightsJob(
        AiManagerInsightsRequestDto request,
        CurrentUserContext currentUser)
    {
        var job = new ManagerAiJobState(Guid.NewGuid(), request, currentUser, DateTime.UtcNow);
        _jobs[job.JobId] = job;
        _latestJobByScope[BuildScopeKey(request, currentUser)] = job.JobId;
        _queue.Writer.TryWrite(job.JobId);

        return ToDto(job);
    }

    public AiManagerInsightsJobDto? GetManagerInsightsJob(Guid jobId, CurrentUserContext currentUser)
    {
        return _jobs.TryGetValue(jobId, out var job) && CanReadJob(job, currentUser)
            ? ToDto(job)
            : null;
    }

    public AiManagerInsightsJobDto? GetLatestManagerInsightsJob(
        AiManagerInsightsRequestDto request,
        CurrentUserContext currentUser)
    {
        return _latestJobByScope.TryGetValue(BuildScopeKey(request, currentUser), out var jobId)
            ? GetManagerInsightsJob(jobId, currentUser)
            : null;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (_jobs.TryGetValue(jobId, out var job))
            {
                await ProcessJobAsync(job, stoppingToken);
            }
        }
    }

    private async Task ProcessJobAsync(ManagerAiJobState job, CancellationToken stoppingToken)
    {
        UpdateJob(job, "running");

        try
        {
            using var scope = serviceScopeFactory.CreateScope();
            var aiInsightsService = scope.ServiceProvider.GetRequiredService<IAiInsightsService>();
            var result = await aiInsightsService.GenerateManagerInsightsAsync(job.Request, job.CurrentUser, stoppingToken);

            lock (job)
            {
                job.Status = "completed";
                job.Result = result;
                job.Error = null;
                job.CompletedAt = DateTime.UtcNow;
                job.UpdatedAt = DateTime.UtcNow;
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            UpdateJob(job, "cancelled", "Server stopped before the AI job completed.");
        }
        catch (Exception error)
        {
            logger.LogError(error, "Manager AI insights job {JobId} failed.", job.JobId);
            UpdateJob(job, "failed", error.Message);
        }
    }

    private static void UpdateJob(ManagerAiJobState job, string status, string? error = null)
    {
        lock (job)
        {
            job.Status = status;
            job.Error = error;
            job.UpdatedAt = DateTime.UtcNow;
            job.CompletedAt = status is "failed" or "cancelled" ? DateTime.UtcNow : job.CompletedAt;
        }
    }

    private static bool CanReadJob(ManagerAiJobState job, CurrentUserContext currentUser)
    {
        return job.CurrentUser.Id == currentUser.Id &&
            job.CurrentUser.TenantId == currentUser.TenantId;
    }

    private static string BuildScopeKey(AiManagerInsightsRequestDto request, CurrentUserContext currentUser)
    {
        return $"{currentUser.Id}:{currentUser.TenantId}:{request.RestaurantId}";
    }

    private static AiManagerInsightsJobDto ToDto(ManagerAiJobState job)
    {
        lock (job)
        {
            return new AiManagerInsightsJobDto
            {
                JobId = job.JobId,
                Status = job.Status,
                RestaurantId = job.Request.RestaurantId,
                Result = job.Result,
                Error = job.Error,
                CreatedAt = job.CreatedAt,
                UpdatedAt = job.UpdatedAt,
                CompletedAt = job.CompletedAt
            };
        }
    }

    private sealed class ManagerAiJobState(
        Guid jobId,
        AiManagerInsightsRequestDto request,
        CurrentUserContext currentUser,
        DateTime createdAt)
    {
        public Guid JobId { get; } = jobId;
        public AiManagerInsightsRequestDto Request { get; } = request;
        public CurrentUserContext CurrentUser { get; } = currentUser;
        public DateTime CreatedAt { get; } = createdAt;
        public string Status { get; set; } = "queued";
        public AiManagerInsightsResponseDto? Result { get; set; }
        public string? Error { get; set; }
        public DateTime UpdatedAt { get; set; } = createdAt;
        public DateTime? CompletedAt { get; set; }
    }
}
