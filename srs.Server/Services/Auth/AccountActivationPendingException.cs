namespace srs.Server.Services.Auth;

public class AccountActivationPendingException : InvalidOperationException
{
    public AccountActivationPendingException(string message) : base(message)
    {
    }
}
