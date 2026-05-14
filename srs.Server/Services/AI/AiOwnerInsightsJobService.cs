using System.Collections.Concurrent;
using System.Threading.Channels;
using srs.Server.Dtos.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Services.AI;

public class AiOwnerInsightsJobService(
    IServiceScopeFactory serviceScopeFactory,
    ILogger<AiOwnerInsightsJobService> logger) : BackgroundService, IAiOwnerInsightsJobService
{
    private readonly Channel<Guid> _queue = Channel.CreateUnbounded<Guid>();
    private readonly ConcurrentDictionary<Guid, OwnerAiJobState> _jobs = new();
    private readonly ConcurrentDictionary<string, Guid> _latestJobByScope = new();

    public AiOwnerInsightsJobDto StartOwnerInsightsJob(
        AiOwnerInsightsRequestDto request,
        CurrentUserContext currentUser)
    {
        var job = new OwnerAiJobState(
            Guid.NewGuid(),
            request,
            currentUser,
            DateTime.UtcNow);

        _jobs[job.JobId] = job;
        _latestJobByScope[BuildScopeKey(request, currentUser)] = job.JobId;
        _queue.Writer.TryWrite(job.JobId);

        return ToDto(job);
    }

    public AiOwnerInsightsJobDto? GetOwnerInsightsJob(Guid jobId, CurrentUserContext currentUser)
    {
        if (!_jobs.TryGetValue(jobId, out var job) || !CanReadJob(job, currentUser))
        {
            return null;
        }

        return ToDto(job);
    }

    public AiOwnerInsightsJobDto? GetLatestOwnerInsightsJob(
        AiOwnerInsightsRequestDto request,
        CurrentUserContext currentUser)
    {
        return _latestJobByScope.TryGetValue(BuildScopeKey(request, currentUser), out var jobId)
            ? GetOwnerInsightsJob(jobId, currentUser)
            : null;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (!_jobs.TryGetValue(jobId, out var job))
            {
                continue;
            }

            await ProcessJobAsync(job, stoppingToken);
        }
    }

    private async Task ProcessJobAsync(OwnerAiJobState job, CancellationToken stoppingToken)
    {
        UpdateJob(job, "running");

        try
        {
            using var scope = serviceScopeFactory.CreateScope();
            var aiInsightsService = scope.ServiceProvider.GetRequiredService<IAiInsightsService>();
            var result = await aiInsightsService.GenerateOwnerInsightsAsync(
                job.Request,
                job.CurrentUser,
                stoppingToken);

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
            logger.LogError(error, "Owner AI insights job {JobId} failed.", job.JobId);
            UpdateJob(job, "failed", error.Message);
        }
    }

    private static void UpdateJob(OwnerAiJobState job, string status, string? error = null)
    {
        lock (job)
        {
            job.Status = status;
            job.Error = error;
            job.UpdatedAt = DateTime.UtcNow;
            job.CompletedAt = status is "failed" or "cancelled" ? DateTime.UtcNow : job.CompletedAt;
        }
    }

    private static bool CanReadJob(OwnerAiJobState job, CurrentUserContext currentUser)
    {
        return job.CurrentUser.Id == currentUser.Id &&
            job.CurrentUser.TenantId == currentUser.TenantId;
    }

    private static string BuildScopeKey(AiOwnerInsightsRequestDto request, CurrentUserContext currentUser)
    {
        return $"{currentUser.Id}:{currentUser.TenantId}:{request.RestaurantId?.ToString() ?? "all"}";
    }

    private static AiOwnerInsightsJobDto ToDto(OwnerAiJobState job)
    {
        lock (job)
        {
            return new AiOwnerInsightsJobDto
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

    private sealed class OwnerAiJobState(
        Guid jobId,
        AiOwnerInsightsRequestDto request,
        CurrentUserContext currentUser,
        DateTime createdAt)
    {
        public Guid JobId { get; } = jobId;
        public AiOwnerInsightsRequestDto Request { get; } = request;
        public CurrentUserContext CurrentUser { get; } = currentUser;
        public DateTime CreatedAt { get; } = createdAt;
        public string Status { get; set; } = "queued";
        public AiOwnerInsightsResponseDto? Result { get; set; }
        public string? Error { get; set; }
        public DateTime UpdatedAt { get; set; } = createdAt;
        public DateTime? CompletedAt { get; set; }
    }
}
