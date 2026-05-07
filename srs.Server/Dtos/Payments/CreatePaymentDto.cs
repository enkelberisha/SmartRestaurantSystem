using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Payments;

public class CreatePaymentDto
{
    [Required]
    public int OrderId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [Required]
    public string Method { get; set; } = null!;
}
