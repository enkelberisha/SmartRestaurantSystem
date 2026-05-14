using System.Security.Claims;
using FluentAssertions;
using Moq;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Unit.Services;

public class RoleAccessServiceTests
{
    [Fact]
    public async Task CanAccessAsync_UsesRoleClaimWhenPresent()
    {
        var currentUserService = new Mock<ICurrentUserService>(MockBehavior.Strict);
        var principal = PrincipalWithRole(UserRole.Manager);
        var service = new RoleAccessService(currentUserService.Object);

        var result = await service.CanAccessAsync(principal, [UserRole.Manager, UserRole.Admin]);

        result.Should().BeTrue();
        currentUserService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CanAccessAsync_FallsBackToCurrentUserWhenRoleClaimIsMissing()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());
        var currentUserService = new Mock<ICurrentUserService>();
        currentUserService
            .Setup(service => service.EnsureUserAsync(principal, It.IsAny<CancellationToken>()))
            .ReturnsAsync(TestData.CurrentUser(UserRole.Owner));
        var service = new RoleAccessService(currentUserService.Object);

        var result = await service.CanAccessAsync(principal, [UserRole.Owner]);

        result.Should().BeTrue();
    }

    private static ClaimsPrincipal PrincipalWithRole(UserRole role)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Role, role.ToString())],
            "Test"));
    }
}
