using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Shifts;
using srs.Server.Models;

namespace srs.Server.Services.Shifts;

public class ShiftService : IShiftService
{
    private readonly AppDbContext _context;

    public ShiftService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ShiftDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Shifts
            .Where(s => s.Staff.Restaurant.TenantId == tenantId)
            .Select(s => Map(s))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ShiftDto>> GetByStaffIdAsync(int staffId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Shifts
            .Where(s => s.StaffId == staffId && s.Staff.Restaurant.TenantId == tenantId)
            .Select(s => Map(s))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<ShiftDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.Shifts
            .Where(s => s.Staff.RestaurantId == restaurantId && s.Staff.Restaurant.TenantId == tenantId)
            .Select(s => Map(s))
            .ToListAsync(cancellationToken);
    }

    public async Task<ShiftDto?> GetByIdAsync(int id, Guid tenantId)
    {
        var shift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.Id == id && s.Staff.Restaurant.TenantId == tenantId);

        return shift == null ? null : Map(shift);
    }

    public async Task<ShiftDto> CreateAsync(CreateShiftDto dto, Guid tenantId)
    {
        if (dto.EndTime <= dto.StartTime)
            throw new ArgumentException("EndTime must be after StartTime.");

        var staffExists = await _context.Staff
            .AnyAsync(s => s.Id == dto.StaffId && s.Restaurant.TenantId == tenantId);

        if (!staffExists)
            throw new ArgumentException("Staff member not found or does not belong to this tenant.");

        var shift = new Shift
        {
            StaffId = dto.StaffId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime
        };

        _context.Shifts.Add(shift);
        await _context.SaveChangesAsync();

        return Map(shift);
    }

    public async Task<bool> UpdateAsync(int id, UpdateShiftDto dto, Guid tenantId)
    {
        if (dto.EndTime <= dto.StartTime)
            throw new ArgumentException("EndTime must be after StartTime.");

        var shift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.Id == id && s.Staff.Restaurant.TenantId == tenantId);

        if (shift == null)
            return false;

        shift.StartTime = dto.StartTime;
        shift.EndTime = dto.EndTime;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var shift = await _context.Shifts
            .FirstOrDefaultAsync(s => s.Id == id && s.Staff.Restaurant.TenantId == tenantId);

        if (shift == null)
            return false;

        _context.Shifts.Remove(shift);
        await _context.SaveChangesAsync();

        return true;
    }

    private static ShiftDto Map(Shift s) => new()
    {
        Id = s.Id,
        StaffId = s.StaffId,
        StartTime = s.StartTime,
        EndTime = s.EndTime
    };
}
