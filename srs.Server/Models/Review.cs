namespace srs.Server.Models;

public class Review
{
    public int Id { get; set; }

    public int? UserId { get; set; }

    public int RestaurantId { get; set; }

    public int Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;
}