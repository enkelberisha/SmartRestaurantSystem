namespace srs.Server.Controllers.AuditLogs
{
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using srs.Server.Services.AuditLogs;
    using srs.Server.Services.Auth;

    [ApiController]
    [Route("api/audit-logs")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;
        private readonly ICurrentUserService _currentUserService;

        public AuditLogsController(
            IAuditLogService auditLogService,
            ICurrentUserService currentUserService)
        {
            _auditLogService = auditLogService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var user = await _currentUserService.EnsureUserAsync(User, cancellationToken);

            var logs = await _auditLogService.GetAllAsync(user.TenantId, cancellationToken);

            return Ok(logs);
        }
    }
}
