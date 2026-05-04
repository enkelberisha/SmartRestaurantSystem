using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Payments;

public class UpdatePaymentStatusDto
{
    [Required]
    public string Status { get; set; } = null!;
}
