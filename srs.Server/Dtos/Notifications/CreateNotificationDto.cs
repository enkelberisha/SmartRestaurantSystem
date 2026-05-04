using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Notifications;

public class CreateNotificationDto
{
    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = null!;
}
