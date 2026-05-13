using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.PurchaseOrders;
using srs.Server.Models;
using srs.Server.Services.Auth;

namespace srs.Server.Services.PurchaseOrders;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly AppDbContext _context;

    public PurchaseOrderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PurchaseOrderDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.PurchaseOrders
            .Where(po => _context.Restaurants.Any(r =>
                r.Id == po.RestaurantId &&
                r.TenantId == tenantId))
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                RestaurantId = po.RestaurantId,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier.Name,
                InventoryItemId = po.InventoryItemId,
                ItemName = po.ItemName,
                Quantity = po.Quantity,
                UnitPrice = po.UnitPrice,
                CreatedByUserId = po.CreatedByUserId,
                CreatedByEmail = po.CreatedByEmail,
                Total = po.Total,
                CreatedAt = po.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<PurchaseOrderDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.PurchaseOrders
            .Where(po => po.RestaurantId == restaurantId &&
                _context.Restaurants.Any(r =>
                    r.Id == restaurantId &&
                    r.TenantId == tenantId))
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                RestaurantId = po.RestaurantId,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier.Name,
                InventoryItemId = po.InventoryItemId,
                ItemName = po.ItemName,
                Quantity = po.Quantity,
                UnitPrice = po.UnitPrice,
                CreatedByUserId = po.CreatedByUserId,
                CreatedByEmail = po.CreatedByEmail,
                Total = po.Total,
                CreatedAt = po.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<PurchaseOrderDto>> GetBySupplierIdAsync(int supplierId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _context.PurchaseOrders
            .Where(po => po.SupplierId == supplierId &&
                _context.Restaurants.Any(r =>
                    r.Id == po.RestaurantId &&
                    r.TenantId == tenantId))
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                RestaurantId = po.RestaurantId,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier.Name,
                InventoryItemId = po.InventoryItemId,
                ItemName = po.ItemName,
                Quantity = po.Quantity,
                UnitPrice = po.UnitPrice,
                CreatedByUserId = po.CreatedByUserId,
                CreatedByEmail = po.CreatedByEmail,
                Total = po.Total,
                CreatedAt = po.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PurchaseOrderDto?> GetByIdAsync(int id, Guid tenantId)
    {
        return await _context.PurchaseOrders
            .Where(po => po.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == po.RestaurantId &&
                    r.TenantId == tenantId))
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                RestaurantId = po.RestaurantId,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier.Name,
                InventoryItemId = po.InventoryItemId,
                ItemName = po.ItemName,
                Quantity = po.Quantity,
                UnitPrice = po.UnitPrice,
                CreatedByUserId = po.CreatedByUserId,
                CreatedByEmail = po.CreatedByEmail,
                Total = po.Total,
                CreatedAt = po.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PurchaseOrderDto> CreateAsync(CreatePurchaseOrderDto dto, Guid tenantId, CurrentUserContext currentUser)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == dto.RestaurantId && r.TenantId == tenantId);

        if (!restaurantExists)
            throw new ArgumentException("Restaurant not found or does not belong to this tenant.");

        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == dto.SupplierId && s.RestaurantId == dto.RestaurantId);

        if (!supplierExists)
            throw new ArgumentException("Supplier not found or does not belong to the specified restaurant.");

        var inventoryItem = await _context.InventoryItems
            .Where(i => i.Id == dto.InventoryItemId &&
                i.SupplierId == dto.SupplierId &&
                _context.Inventories.Any(inv => inv.Id == i.InventoryId && inv.RestaurantId == dto.RestaurantId))
            .Select(i => new
            {
                i.Id,
                i.ItemName,
                i.UnitPrice
            })
            .FirstOrDefaultAsync();

        if (inventoryItem == null)
            throw new ArgumentException("Inventory item not found or does not belong to the selected supplier and restaurant.");

        var total = dto.Quantity * inventoryItem.UnitPrice;

        var purchaseOrder = new PurchaseOrder
        {
            RestaurantId = dto.RestaurantId,
            SupplierId = dto.SupplierId,
            InventoryItemId = inventoryItem.Id,
            ItemName = inventoryItem.ItemName,
            Quantity = dto.Quantity,
            UnitPrice = inventoryItem.UnitPrice,
            CreatedByUserId = currentUser.Id,
            CreatedByEmail = currentUser.Email,
            Total = total,
            CreatedAt = DateTime.UtcNow
        };

        _context.PurchaseOrders.Add(purchaseOrder);
        await _context.SaveChangesAsync();

        var supplierName = await _context.Suppliers
            .Where(s => s.Id == purchaseOrder.SupplierId)
            .Select(s => s.Name)
            .FirstAsync();

        return new PurchaseOrderDto
        {
            Id = purchaseOrder.Id,
            RestaurantId = purchaseOrder.RestaurantId,
            SupplierId = purchaseOrder.SupplierId,
            SupplierName = supplierName,
            InventoryItemId = purchaseOrder.InventoryItemId,
            ItemName = purchaseOrder.ItemName,
            Quantity = purchaseOrder.Quantity,
            UnitPrice = purchaseOrder.UnitPrice,
            CreatedByUserId = purchaseOrder.CreatedByUserId,
            CreatedByEmail = purchaseOrder.CreatedByEmail,
            Total = purchaseOrder.Total,
            CreatedAt = purchaseOrder.CreatedAt
        };
    }

    public async Task<bool> UpdateAsync(int id, UpdatePurchaseOrderDto dto, Guid tenantId)
    {
        var purchaseOrder = await _context.PurchaseOrders
            .FirstOrDefaultAsync(po => po.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == po.RestaurantId &&
                    r.TenantId == tenantId));

        if (purchaseOrder == null)
            return false;

        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == dto.SupplierId && s.RestaurantId == purchaseOrder.RestaurantId);

        if (!supplierExists)
            throw new ArgumentException("Supplier not found or does not belong to the restaurant.");

        var inventoryItem = await _context.InventoryItems
            .Where(i => i.Id == dto.InventoryItemId &&
                i.SupplierId == dto.SupplierId &&
                _context.Inventories.Any(inv => inv.Id == i.InventoryId && inv.RestaurantId == purchaseOrder.RestaurantId))
            .Select(i => new
            {
                i.Id,
                i.ItemName,
                i.UnitPrice
            })
            .FirstOrDefaultAsync();

        if (inventoryItem == null)
            throw new ArgumentException("Inventory item not found or does not belong to the selected supplier and restaurant.");

        purchaseOrder.SupplierId = dto.SupplierId;
        purchaseOrder.InventoryItemId = inventoryItem.Id;
        purchaseOrder.ItemName = inventoryItem.ItemName;
        purchaseOrder.Quantity = dto.Quantity;
        purchaseOrder.UnitPrice = inventoryItem.UnitPrice;
        purchaseOrder.Total = dto.Quantity * inventoryItem.UnitPrice;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, Guid tenantId)
    {
        var purchaseOrder = await _context.PurchaseOrders
            .FirstOrDefaultAsync(po => po.Id == id &&
                _context.Restaurants.Any(r =>
                    r.Id == po.RestaurantId &&
                    r.TenantId == tenantId));

        if (purchaseOrder == null)
            return false;

        _context.PurchaseOrders.Remove(purchaseOrder);
        await _context.SaveChangesAsync();

        return true;
    }
}
