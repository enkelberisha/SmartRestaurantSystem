namespace srs.Server.Services.Cloudinary;

public class CloudinaryOptions
{
    public string CloudName { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    public string ApiSecret { get; set; } = string.Empty;

    public string Folder { get; set; } = "smart-restaurant-system/menu-items";
}
