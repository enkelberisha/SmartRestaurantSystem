namespace srs.Server.Services.Staff
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Dtos.Staff;
    using srs.Server.Models;
    using srs.Server.Models.Enums;

    public class StaffService : IStaffService
    {
        private readonly AppDbContext _context;

        public StaffService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<StaffResponseDto> CreateAsync(StaffRequestDto dto, Guid tenantId, CancellationToken ct)
        {
            await ValidateAsync(dto, null, tenantId, ct);

            var entity = new Staff
            {
                UserId = dto.UserId,
                RestaurantId = dto.RestaurantId,
                Position = dto.Position
            };

            _context.Staff.Add(entity);
            await _context.SaveChangesAsync(ct);

            return Map(entity);
        }

        public async Task<List<StaffResponseDto>> GetAllAsync(Guid tenantId)
        {
            return await _context.Staff
                .Where(s => s.Restaurant.TenantId == tenantId)
                .Select(s => Map(s))
                .ToListAsync();
        }

        public async Task<List<StaffResponseDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken ct)
        {
            return await _context.Staff
                .Where(s => s.RestaurantId == restaurantId && s.Restaurant.TenantId == tenantId)
                .Select(s => Map(s))
                .ToListAsync(ct);
        }

        public async Task<StaffResponseDto?> GetByIdAsync(int id, Guid tenantId)
        {
            var entity = await _context.Staff
                .FirstOrDefaultAsync(s => s.Id == id && s.Restaurant.TenantId == tenantId);

            return entity == null ? null : Map(entity);
        }

        public async Task<StaffResponseDto?> UpdateAsync(int id, StaffRequestDto dto, Guid tenantId, CancellationToken ct)
        {
            var entity = await _context.Staff
                .FirstOrDefaultAsync(s => s.Id == id && s.Restaurant.TenantId == tenantId, ct);

            if (entity == null)
                return null;

            await ValidateAsync(dto, id, tenantId, ct);

            entity.UserId = dto.UserId;
            entity.RestaurantId = dto.RestaurantId;
            entity.Position = dto.Position;

            await _context.SaveChangesAsync(ct);

            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id, Guid tenantId, CancellationToken ct)
        {
            var entity = await _context.Staff
                .FirstOrDefaultAsync(s => s.Id == id && s.Restaurant.TenantId == tenantId, ct);

            if (entity == null)
                return false;

            _context.Staff.Remove(entity);
            await _context.SaveChangesAsync(ct);

            return true;
        }

        private static StaffResponseDto Map(Staff s)
        {
            return new StaffResponseDto
            {
                Id = s.Id,
                UserId = s.UserId,
                RestaurantId = s.RestaurantId,
                Position = s.Position
            };
        }

        private async Task ValidateAsync(StaffRequestDto dto, int? currentId, Guid tenantId, CancellationToken ct)
        {
            if (dto.UserId <= 0)
                throw new Exception("UserId is required");

            if (dto.RestaurantId <= 0)
                throw new Exception("RestaurantId is required");

            if (!Enum.IsDefined(typeof(StaffPosition), dto.Position))
                throw new Exception("Position is required");

            var userExists = await _context.Users
                .AnyAsync(u => u.Id == dto.UserId && u.TenantId == tenantId, ct);

            if (!userExists)
                throw new Exception("User does not exist");

            var restaurantExists = await _context.Restaurants
                .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId, ct);

            if (!restaurantExists)
                throw new Exception("Restaurant does not exist");

            var alreadyStaff = await _context.Staff.AnyAsync(s =>
                s.UserId == dto.UserId &&
                s.RestaurantId == dto.RestaurantId &&
                (currentId == null || s.Id != currentId), ct);

            if (alreadyStaff)
                throw new Exception("This user is already staff in this restaurant");
        }
    }
}

