namespace srs.Server.Services.Supabase;

public interface ISupabaseAdminService
{
    Task<(Guid Id, string Email)> CreateUserAsync(string email, string password, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(Guid supabaseUserId, CancellationToken cancellationToken = default);
}
