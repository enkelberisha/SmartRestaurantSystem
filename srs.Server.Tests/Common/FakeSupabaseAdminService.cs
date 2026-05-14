using srs.Server.Services.Supabase;

namespace srs.Server.Tests.Common;

public sealed class FakeSupabaseAdminService : ISupabaseAdminService
{
    public List<Guid> DeletedUserIds { get; } = [];
    public List<(Guid UserId, string Password)> PasswordUpdates { get; } = [];
    public List<(Guid UserId, string Email)> EmailUpdates { get; } = [];

    public bool VerifyPasswordResult { get; set; } = true;

    public Task<(Guid Id, string Email)> CreateUserAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult((Guid.NewGuid(), email));
    }

    public Task DeleteUserAsync(Guid supabaseUserId, CancellationToken cancellationToken = default)
    {
        DeletedUserIds.Add(supabaseUserId);
        return Task.CompletedTask;
    }

    public Task UpdateUserEmailAsync(Guid supabaseUserId, string email, CancellationToken cancellationToken = default)
    {
        EmailUpdates.Add((supabaseUserId, email));
        return Task.CompletedTask;
    }

    public Task UpdateUserPasswordAsync(Guid supabaseUserId, string password, CancellationToken cancellationToken = default)
    {
        PasswordUpdates.Add((supabaseUserId, password));
        return Task.CompletedTask;
    }

    public Task<bool> VerifyPasswordAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(VerifyPasswordResult);
    }
}
