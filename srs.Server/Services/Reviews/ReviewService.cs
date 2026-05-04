using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Reviews;
using srs.Server.Models;

namespace srs.Server.Services.Reviews;

public class ReviewService : IReviewService
{
    private readonly AppDbContext _context;

    public ReviewService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ReviewDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Reviews
            .Where(r => r.Restaurant.TenantId == tenantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => Map(r))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ReviewDto>> GetByRestaurantIdAsync(int restaurantId, CancellationToken cancellationToken = default)
    {
        return await _context.Reviews
            .Where(r => r.RestaurantId == restaurantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => Map(r))
            .ToListAsync(cancellationToken);
    }

    public async Task<ReviewDto?> GetByIdAsync(int id)
    {
        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        return review == null ? null : Map(review);
    }

    public async Task<ReviewDto> CreateAsync(CreateReviewDto dto, int userId, Guid tenantId)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId);

        if (!restaurantExists)
            throw new ArgumentException("Restaurant not found or does not belong to this tenant.");

        var alreadyReviewed = await _context.Reviews
            .AnyAsync(r => r.RestaurantId == dto.RestaurantId && r.UserId == userId);

        if (alreadyReviewed)
            throw new InvalidOperationException("You have already submitted a review for this restaurant.");

        var review = new Review
        {
            UserId = userId,
            RestaurantId = dto.RestaurantId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        return Map(review);
    }

    public async Task<bool> UpdateAsync(int id, UpdateReviewDto dto, int userId, Guid tenantId)
    {
        var review = await _context.Reviews
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId && r.Restaurant.TenantId == tenantId);

        if (review == null)
            return false;

        review.Rating = dto.Rating;
        review.Comment = dto.Comment;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, int? userId, Guid tenantId)
    {
        var query = _context.Reviews
            .Where(r => r.Id == id && r.Restaurant.TenantId == tenantId);

        // when userId is provided, restrict to the owner; null means admin bypass
        if (userId.HasValue)
            query = query.Where(r => r.UserId == userId.Value);

        var review = await query.FirstOrDefaultAsync();

        if (review == null)
            return false;

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        return true;
    }

    private static ReviewDto Map(Review r) => new()
    {
        Id = r.Id,
        UserId = r.UserId,
        RestaurantId = r.RestaurantId,
        Rating = r.Rating,
        Comment = r.Comment,
        CreatedAt = r.CreatedAt
    };
}
