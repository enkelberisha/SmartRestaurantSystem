namespace srs.Server.Dtos.Tenants;

public class TenantRequestDto
{
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
