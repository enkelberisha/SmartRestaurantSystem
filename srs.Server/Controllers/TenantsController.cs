using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Tenants;
using srs.Server.Services.Tenants;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize(Roles = "SuperAdmin")]
public class TenantsController(ITenantService tenantService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var tenants = await tenantService.GetAllAsync(cancellationToken);
        return Ok(tenants);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var tenant = await tenantService.GetByIdAsync(id, cancellationToken);
        return tenant is null ? NotFound() : Ok(tenant);
    }

    [HttpGet("{id:guid}/users")]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken cancellationToken)
    {
        var tenant = await tenantService.GetByIdAsync(id, cancellationToken);
        if (tenant is null)
        {
            return NotFound();
        }

        var members = await tenantService.GetMembersAsync(id, cancellationToken);
        return Ok(members);
    }

    [HttpPost]
    public async Task<IActionResult> Create(TenantRequestDto dto, CancellationToken cancellationToken)
    {
        var tenant = await tenantService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TenantRequestDto dto, CancellationToken cancellationToken)
    {
        var tenant = await tenantService.UpdateAsync(id, dto, cancellationToken);
        return tenant is null ? NotFound() : Ok(tenant);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await tenantService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
