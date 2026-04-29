namespace srs.Server.Dtos.Tenants
{
    public class UpdateTenantDto
    {
        public string Name { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
