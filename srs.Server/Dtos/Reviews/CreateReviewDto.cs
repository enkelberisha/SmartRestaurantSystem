using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Reviews;

public class CreateReviewDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
}
