using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace srs.Server.Tests.Common;

public sealed class NoOpClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        return Task.FromResult(principal);
    }
}
