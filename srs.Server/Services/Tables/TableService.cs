namespace srs.Server.Services.Tables
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Dtos.Tables;
    using srs.Server.Models;
    using srs.Server.Models.Enums;

    public class TableService : ITableService
    {
        private readonly AppDbContext _context;

        public TableService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TableResponseDto> CreateAsync(TableRequestDto dto, CancellationToken ct)
        {
            await ValidateAsync(dto, null, ct);

            var entity = new Table
            {
                RestaurantId = dto.RestaurantId,
                Number = dto.Number,
                Capacity = dto.Capacity,
                Status = dto.Status,
                AssignedStaffId = dto.AssignedStaffId
            };

            _context.Tables.Add(entity);
            await _context.SaveChangesAsync(ct);

            return Map(entity);
        }

        public async Task<List<TableResponseDto>> GetAllAsync()
        {
            return await _context.Tables
                .Select(t => Map(t))
                .ToListAsync();
        }

        public async Task<TableResponseDto?> GetByIdAsync(int id)
        {
            var entity = await _context.Tables.FindAsync(id);
            return entity == null ? null : Map(entity);
        }

        public async Task<TableResponseDto?> UpdateAsync(int id, TableRequestDto dto, CancellationToken ct)
        {
            var entity = await _context.Tables.FindAsync(id);
            if (entity == null) return null;

            await ValidateAsync(dto, id, ct);

            entity.RestaurantId = dto.RestaurantId;
            entity.Number = dto.Number;
            entity.Capacity = dto.Capacity;
            entity.Status = dto.Status;
            entity.AssignedStaffId = dto.AssignedStaffId;

            await _context.SaveChangesAsync(ct);

            return Map(entity);
        }

        private static TableResponseDto Map(Table t)
        {
            return new TableResponseDto
            {
                Id = t.Id,
                RestaurantId = t.RestaurantId,
                Number = t.Number,
                Capacity = t.Capacity,
                Status = t.Status,
                AssignedStaffId = t.AssignedStaffId
            };
        }

        private async Task ValidateAsync(TableRequestDto dto, int? currentId, CancellationToken ct)
        {
            if (dto.RestaurantId <= 0)
                throw new Exception("RestaurantId is required");

            if (dto.Number <= 0)
                throw new Exception("Table number must be greater than 0");

            if (dto.Capacity <= 0)
                throw new Exception("Table capacity must be greater than 0");

            if (!Enum.IsDefined(typeof(TableStatus), dto.Status))
                throw new Exception("Status is required");

            var restaurantExists = await _context.Restaurants
                .AnyAsync(r => r.Id == dto.RestaurantId, ct);

            if (!restaurantExists)
                throw new Exception("Restaurant does not exist");

            if (dto.AssignedStaffId.HasValue)
            {
                var staffExists = await _context.Staff
                    .AnyAsync(s => s.Id == dto.AssignedStaffId.Value, ct);

                if (!staffExists)
                    throw new Exception("Assigned staff does not exist");
            }

            var tableNumberExists = await _context.Tables.AnyAsync(t =>
                t.RestaurantId == dto.RestaurantId &&
                t.Number == dto.Number &&
                (currentId == null || t.Id != currentId), ct);

            if (tableNumberExists)
                throw new Exception("A table with this number already exists in this restaurant");
        }
    }
}