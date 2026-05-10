namespace srs.Server.Services.Cloudinary;

public interface ICloudinaryService
{
    Task<CloudinaryUploadResult> UploadImageAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    Task DeleteImageAsync(string publicId, CancellationToken cancellationToken = default);
}
