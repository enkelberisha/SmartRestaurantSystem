using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;

namespace srs.Server.Services.Cloudinary;

public class CloudinaryService : ICloudinaryService
{
    private readonly CloudinaryDotNet.Cloudinary _cloudinary;
    private readonly CloudinaryOptions _options;
    private readonly ILogger<CloudinaryService> _logger;

    public CloudinaryService(
        IOptions<CloudinaryOptions> options,
        ILogger<CloudinaryService> logger)
    {
        _options = options.Value;
        _logger = logger;

        EnsureConfigured();

        var account = new Account(
            _options.CloudName,
            _options.ApiKey,
            _options.ApiSecret);

        _cloudinary = new CloudinaryDotNet.Cloudinary(account);
    }

    public async Task<CloudinaryUploadResult> UploadImageAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var uploadParams = new ImageUploadParams
        {
            Folder = _options.Folder,
            File = new FileDescription(fileName, fileStream)
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams, cancellationToken);

        if (uploadResult.Error != null)
        {
            _logger.LogError("Cloudinary upload failed: {Message}", uploadResult.Error.Message);
            throw new InvalidOperationException($"Cloudinary error: {uploadResult.Error.Message}");
        }

        var secureUrl = uploadResult.SecureUrl?.ToString();
        var publicId = uploadResult.PublicId;

        if (string.IsNullOrWhiteSpace(secureUrl) || string.IsNullOrWhiteSpace(publicId))
        {
            throw new InvalidOperationException("Cloudinary response was missing image details.");
        }

        return new CloudinaryUploadResult
        {
            SecureUrl = secureUrl,
            PublicId = publicId
        };
    }

    public async Task DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return;
        }

        var deletionParams = new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image
        };

        var deletionResult = await _cloudinary.DestroyAsync(deletionParams);

        if (deletionResult.Error == null)
        {
            return;
        }

        _logger.LogWarning("Cloudinary delete failed for {PublicId}: {Message}", publicId, deletionResult.Error.Message);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.CloudName) ||
            string.IsNullOrWhiteSpace(_options.ApiKey) ||
            string.IsNullOrWhiteSpace(_options.ApiSecret))
        {
            throw new InvalidOperationException("Cloudinary is not configured on the server.");
        }
    }
}
