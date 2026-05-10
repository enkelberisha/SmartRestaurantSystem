namespace srs.Server.Services.Supabase;

public interface ISupabaseAdminService
{
    Task<(Guid Id, string Email)> CreateUserAsync(string email, string password, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(Guid supabaseUserId, CancellationToken cancellationToken = default);
    Task UpdateUserEmailAsync(Guid supabaseUserId, string email, CancellationToken cancellationToken = default);
    Task UpdateUserPasswordAsync(Guid supabaseUserId, string password, CancellationToken cancellationToken = default);
    Task<bool> VerifyPasswordAsync(string email, string password, CancellationToken cancellationToken = default);
}
