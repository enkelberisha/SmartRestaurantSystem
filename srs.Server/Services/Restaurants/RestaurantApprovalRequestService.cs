using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.Supabase;

namespace srs.Server.Services.Restaurants;

public class RestaurantApprovalRequestService(
    AppDbContext context,
    IDataProtectionProvider dataProtectionProvider,
    ISupabaseAdminService supabaseAdminService) : IRestaurantApprovalRequestService
{
    private sealed record PreparedRestaurantAccount(string Email, string Password, UserRole Role);
    private sealed record CreatedSupabaseAccount(Guid Id, string Email, UserRole Role);

    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("restaurant-approval-requests");

    public async Task<RestaurantApprovalRequestDto> SubmitCreateAsync(
        CreateRestaurantApprovalRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("User has no tenant.");
        ValidateCreatePayload(dto);
        var preparedAccounts = PrepareAccounts(dto.Accounts);
        await EnsureAccountsAreAvailableOrLinkableAsync(tenantId, preparedAccounts, null, cancellationToken);

        var protectedPayload = _protector.Protect(JsonSerializer.Serialize(dto));
        var request = new RestaurantApprovalRequest
        {
            TenantId = tenantId,
            RequestedByUserId = currentUser.Id,
            Type = RestaurantApprovalRequestType.Create,
            Summary = $"Create restaurant: {dto.Restaurant.Name.Trim()}",
            ProtectedPayload = protectedPayload
        };

        context.RestaurantApprovalRequests.Add(request);
        await context.SaveChangesAsync(cancellationToken);
        return await MapAsync(request.Id, cancellationToken) ?? throw new InvalidOperationException("Could not load created request.");
    }

    public async Task<RestaurantApprovalRequestDto> SubmitDeleteAsync(
        DeleteRestaurantApprovalRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("User has no tenant.");
        if (string.IsNullOrWhiteSpace(dto.AdminPassword))
            throw new ArgumentException("Admin password is required.");

        var passwordValid = await supabaseAdminService.VerifyPasswordAsync(currentUser.Email, dto.AdminPassword, cancellationToken);
        if (!passwordValid)
            throw new InvalidOperationException("Admin password confirmation failed.");

        var restaurant = await context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(current => current.Id == dto.RestaurantId && current.TenantId == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant was not found.");

        var protectedPayload = _protector.Protect(JsonSerializer.Serialize(dto));
        var request = new RestaurantApprovalRequest
        {
            TenantId = tenantId,
            RequestedByUserId = currentUser.Id,
            RestaurantId = restaurant.Id,
            Type = RestaurantApprovalRequestType.Delete,
            Summary = $"Delete restaurant: {restaurant.Name}",
            ProtectedPayload = protectedPayload,
            AdminPasswordConfirmation = "Verified"
        };

        context.RestaurantApprovalRequests.Add(request);
        await context.SaveChangesAsync(cancellationToken);
        return await MapAsync(request.Id, cancellationToken) ?? throw new InvalidOperationException("Could not load created request.");
    }

    public async Task<IReadOnlyList<RestaurantApprovalRequestDetailDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var requests = await context.RestaurantApprovalRequests
            .AsNoTracking()
            .Include(request => request.RequestedByUser)
            .Include(request => request.Restaurant)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        return requests.Select(MapDetail).ToList();
    }

    public async Task<IReadOnlyList<RestaurantApprovalRequestDetailDto>> GetMineAsync(
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("User has no tenant.");

        var requests = await context.RestaurantApprovalRequests
            .AsNoTracking()
            .Include(request => request.RequestedByUser)
            .Include(request => request.Restaurant)
            .Where(request => request.TenantId == tenantId && request.RequestedByUserId == currentUser.Id)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        return requests.Select(MapDetail).ToList();
    }

    public async Task<RestaurantApprovalRequestDetailDto?> UpdateCreateAsync(
        int id,
        CreateRestaurantApprovalRequestDto dto,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var request = await GetEditableCreateRequestAsync(id, currentUser, cancellationToken);
        if (request is null)
            return null;

        ValidateCreatePayload(dto);
        var preparedAccounts = PrepareAccounts(dto.Accounts);
        await EnsureAccountsAreAvailableOrLinkableAsync(request.TenantId, preparedAccounts, request.RestaurantId, cancellationToken);

        request.Summary = $"Create restaurant: {dto.Restaurant.Name.Trim()}";
        request.ProtectedPayload = _protector.Protect(JsonSerializer.Serialize(dto));
        request.ReviewedByUserId = null;
        request.ReviewedAt = null;
        request.RejectionReason = null;
        await context.SaveChangesAsync(cancellationToken);

        return await GetMineDetailAsync(id, currentUser, cancellationToken);
    }

    public async Task<RestaurantApprovalRequestDetailDto?> ResubmitAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var request = await GetEditableCreateRequestAsync(id, currentUser, cancellationToken);
        if (request is null)
            return null;

        if (request.Status != RestaurantApprovalRequestStatus.Rejected)
            throw new InvalidOperationException("Only rejected create requests can be resent.");

        var payload = JsonSerializer.Deserialize<CreateRestaurantApprovalRequestDto>(_protector.Unprotect(request.ProtectedPayload))
            ?? throw new InvalidOperationException("Invalid restaurant creation request payload.");

        ValidateCreatePayload(payload);
        var preparedAccounts = PrepareAccounts(payload.Accounts);
        await EnsureAccountsAreAvailableOrLinkableAsync(request.TenantId, preparedAccounts, request.RestaurantId, cancellationToken);

        request.Status = RestaurantApprovalRequestStatus.Pending;
        request.RejectionReason = null;
        request.ReviewedByUserId = null;
        request.ReviewedAt = null;
        request.Summary = $"Create restaurant: {payload.Restaurant.Name.Trim()}";
        await context.SaveChangesAsync(cancellationToken);

        return await GetMineDetailAsync(id, currentUser, cancellationToken);
    }

    public async Task<RestaurantApprovalRequestDto?> ApproveAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var request = await context.RestaurantApprovalRequests
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (request is null)
            return null;

        if (request.Status != RestaurantApprovalRequestStatus.Pending)
            throw new InvalidOperationException("Only pending requests can be approved.");

        if (request.Type == RestaurantApprovalRequestType.Create)
            await ExecuteCreateAsync(request, currentUser, cancellationToken);
        else
            await ExecuteDeleteAsync(request, cancellationToken);

        if (request.Type != RestaurantApprovalRequestType.Create)
        {
            request.Status = RestaurantApprovalRequestStatus.Approved;
            request.ReviewedByUserId = currentUser.Id;
            request.ReviewedAt = DateTime.UtcNow;
            context.Notifications.Add(new Notification
            {
                UserId = request.RequestedByUserId,
                Message = $"{request.Summary} was approved by Super Admin."
            });
            await context.SaveChangesAsync(cancellationToken);
        }

        return await MapAsync(request.Id, cancellationToken);
    }

    public async Task<RestaurantApprovalRequestDto?> RejectAsync(
        int id,
        string? reason,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        var request = await context.RestaurantApprovalRequests
            .FirstOrDefaultAsync(current => current.Id == id, cancellationToken);

        if (request is null)
            return null;

        if (request.Status != RestaurantApprovalRequestStatus.Pending)
            throw new InvalidOperationException("Only pending requests can be rejected.");

        request.Status = RestaurantApprovalRequestStatus.Rejected;
        request.RejectionReason = reason;
        request.ReviewedByUserId = currentUser.Id;
        request.ReviewedAt = DateTime.UtcNow;
        context.Notifications.Add(new Notification
        {
            UserId = request.RequestedByUserId,
            Message = string.IsNullOrWhiteSpace(reason)
                ? $"{request.Summary} was rejected by Super Admin."
                : $"{request.Summary} was rejected by Super Admin. Reason: {reason}"
        });
        await context.SaveChangesAsync(cancellationToken);
        return await MapAsync(request.Id, cancellationToken);
    }

    private async Task ExecuteCreateAsync(
        RestaurantApprovalRequest request,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<CreateRestaurantApprovalRequestDto>(_protector.Unprotect(request.ProtectedPayload))
            ?? throw new InvalidOperationException("Invalid restaurant creation request payload.");

        var preparedAccounts = PrepareAccounts(payload.Accounts);

        if (await TryFinalizeExistingProvisioningAsync(request, payload, preparedAccounts, currentUser, cancellationToken))
        {
            return;
        }

        await EnsureAccountsAreAvailableOrLinkableAsync(request.TenantId, preparedAccounts, null, cancellationToken);

        var createdSupabaseAccounts = new List<CreatedSupabaseAccount>();
        var existingLinkableUsers = await context.Users
            .Where(user => user.TenantId == request.TenantId && preparedAccounts.Select(account => account.Email).Contains(user.Email))
            .ToListAsync(cancellationToken);

        try
        {
            foreach (var account in preparedAccounts)
            {
                if (existingLinkableUsers.Any(user => string.Equals(user.Email, account.Email, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                var created = await supabaseAdminService.CreateUserAsync(account.Email, account.Password, cancellationToken);
                createdSupabaseAccounts.Add(new CreatedSupabaseAccount(created.Id, created.Email, account.Role));
            }

            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            var restaurant = new Restaurant
            {
                TenantId = request.TenantId,
                Name = payload.Restaurant.Name.Trim(),
                Location = payload.Restaurant.Location.Trim(),
                CuisineType = payload.Restaurant.CuisineType?.Trim(),
                ContactEmail = payload.Restaurant.ContactEmail?.Trim(),
                ContactPhone = payload.Restaurant.ContactPhone?.Trim(),
                LogoUrl = payload.Restaurant.LogoUrl?.Trim(),
                OwnerId = payload.Restaurant.OwnerId,
                ManagerId = payload.Restaurant.ManagerId
            };

            context.Restaurants.Add(restaurant);
            await context.SaveChangesAsync(cancellationToken);

            foreach (var existingUser in existingLinkableUsers)
            {
                existingUser.RestaurantId = restaurant.Id;
                existingUser.IsActivated = IsActivated(existingUser.Role, existingUser.TenantId, restaurant.Id);
            }

            foreach (var account in createdSupabaseAccounts)
            {
                context.Users.Add(new User
                {
                    SupabaseUserId = account.Id,
                    Email = account.Email,
                    Role = account.Role,
                    TenantId = request.TenantId,
                    RestaurantId = restaurant.Id,
                    IsActivated = IsActivated(account.Role, request.TenantId, restaurant.Id)
                });
            }

            request.RestaurantId = restaurant.Id;
            request.Status = RestaurantApprovalRequestStatus.Approved;
            request.ReviewedByUserId = currentUser.Id;
            request.ReviewedAt = DateTime.UtcNow;
            context.Notifications.Add(new Notification
            {
                UserId = request.RequestedByUserId,
                Message = $"{request.Summary} was approved by Super Admin."
            });

            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            foreach (var account in createdSupabaseAccounts)
            {
                try
                {
                    await supabaseAdminService.DeleteUserAsync(account.Id, cancellationToken);
                }
                catch
                {
                }
            }

            throw;
        }
    }

    private async Task ExecuteDeleteAsync(RestaurantApprovalRequest request, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<DeleteRestaurantApprovalRequestDto>(_protector.Unprotect(request.ProtectedPayload))
            ?? throw new InvalidOperationException("Invalid restaurant deletion request payload.");

        var restaurant = await context.Restaurants
            .FirstOrDefaultAsync(current => current.Id == payload.RestaurantId && current.TenantId == request.TenantId, cancellationToken);

        if (restaurant is not null)
            context.Restaurants.Remove(restaurant);
    }

    private async Task<RestaurantApprovalRequestDto?> MapAsync(int id, CancellationToken cancellationToken)
    {
        return await context.RestaurantApprovalRequests
            .AsNoTracking()
            .Include(request => request.RequestedByUser)
            .Where(request => request.Id == id)
            .Select(request => Map(request))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static RestaurantApprovalRequestDto Map(RestaurantApprovalRequest request) => new()
    {
        Id = request.Id,
        TenantId = request.TenantId,
        RequestedByUserId = request.RequestedByUserId,
        RequestedByEmail = request.RequestedByUser.Email,
        RestaurantId = request.RestaurantId,
        Type = request.Type,
        Status = request.Status,
        Summary = request.Summary,
        RejectionReason = request.RejectionReason,
        CreatedAt = request.CreatedAt,
        ReviewedAt = request.ReviewedAt
    };

    private RestaurantApprovalRequestDetailDto MapDetail(RestaurantApprovalRequest request)
    {
        var detail = new RestaurantApprovalRequestDetailDto
        {
            Id = request.Id,
            TenantId = request.TenantId,
            RequestedByUserId = request.RequestedByUserId,
            RequestedByEmail = request.RequestedByUser.Email,
            RestaurantId = request.RestaurantId,
            Type = request.Type,
            Status = request.Status,
            Summary = request.Summary,
            RejectionReason = request.RejectionReason,
            CreatedAt = request.CreatedAt,
            ReviewedAt = request.ReviewedAt
        };

        if (request.Type == RestaurantApprovalRequestType.Create)
        {
            var payload = JsonSerializer.Deserialize<CreateRestaurantApprovalRequestDto>(_protector.Unprotect(request.ProtectedPayload));
            detail.Restaurant = payload?.Restaurant;
            detail.Accounts = payload?.Accounts.Select(account => new RestaurantAccountRequestDto
            {
                Email = account.Email,
                Role = account.Role,
                Password = string.Empty
            }).ToList() ?? [];
        }
        else if (request.Type == RestaurantApprovalRequestType.Delete && request.Restaurant is not null)
        {
            detail.Restaurant = new RestaurantRequestDto
            {
                Name = request.Restaurant.Name,
                Location = request.Restaurant.Location,
                CuisineType = request.Restaurant.CuisineType,
                ContactEmail = request.Restaurant.ContactEmail,
                ContactPhone = request.Restaurant.ContactPhone,
                LogoUrl = request.Restaurant.LogoUrl,
                OwnerId = request.Restaurant.OwnerId,
                ManagerId = request.Restaurant.ManagerId
            };
        }

        return detail;
    }

    private static void ValidateCreatePayload(CreateRestaurantApprovalRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Restaurant.Name))
            throw new ArgumentException("Restaurant name is required.");
        if (string.IsNullOrWhiteSpace(dto.Restaurant.Location))
            throw new ArgumentException("Restaurant location is required.");
    }

    private static List<PreparedRestaurantAccount> PrepareAccounts(IEnumerable<RestaurantAccountRequestDto> accounts)
    {
        var prepared = new List<PreparedRestaurantAccount>();
        var emails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var account in accounts)
        {
            var email = account.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException($"Email is required for the {account.Role} account.");
            if (string.IsNullOrWhiteSpace(account.Password))
                throw new ArgumentException($"Password is required for the {account.Role} account.");
            if (!emails.Add(email))
                throw new ArgumentException($"The email {email} is used more than once in the operational accounts.");

            prepared.Add(new PreparedRestaurantAccount(email, account.Password, account.Role));
        }

        return prepared;
    }

    private async Task EnsureAccountsAreAvailableOrLinkableAsync(
        Guid tenantId,
        IEnumerable<PreparedRestaurantAccount> accounts,
        int? targetRestaurantId,
        CancellationToken cancellationToken)
    {
        var preparedAccounts = accounts.ToList();
        var emails = preparedAccounts.Select(account => account.Email).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (emails.Count == 0)
            throw new ArgumentException("Operational accounts are required.");

        var existingUser = await context.Users
            .AsNoTracking()
            .Where(user => emails.Contains(user.Email))
            .FirstOrDefaultAsync(cancellationToken);

        if (existingUser is null)
            return;

        foreach (var account in preparedAccounts)
        {
            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(current => current.Email == account.Email, cancellationToken);

            if (user is null)
                continue;

            if (user.TenantId != tenantId)
                throw new InvalidOperationException($"The email {account.Email} is already in use.");

            if (user.Role != account.Role)
                throw new InvalidOperationException($"The email {account.Email} already belongs to a {user.Role} account. Use a matching {account.Role} account email.");

            if (user.RestaurantId.HasValue && user.RestaurantId != targetRestaurantId)
                throw new InvalidOperationException($"The email {account.Email} is already linked to another restaurant.");
        }
    }

    private async Task<bool> TryFinalizeExistingProvisioningAsync(
        RestaurantApprovalRequest request,
        CreateRestaurantApprovalRequestDto payload,
        IReadOnlyCollection<PreparedRestaurantAccount> accounts,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        var normalizedName = payload.Restaurant.Name.Trim();
        var normalizedLocation = payload.Restaurant.Location.Trim();

        var restaurant = await context.Restaurants
            .FirstOrDefaultAsync(
                current => current.TenantId == request.TenantId
                    && current.Name == normalizedName
                    && current.Location == normalizedLocation,
                cancellationToken);

        if (restaurant is null)
        {
            return false;
        }

        var existingUsers = await context.Users
            .Where(user => user.TenantId == request.TenantId && accounts.Select(account => account.Email).Contains(user.Email))
            .ToListAsync(cancellationToken);

        foreach (var account in accounts)
        {
            var existingUser = existingUsers.FirstOrDefault(user =>
                string.Equals(user.Email, account.Email, StringComparison.OrdinalIgnoreCase));

            if (existingUser is null)
            {
                return false;
            }

            if (existingUser.TenantId != request.TenantId || existingUser.Role != account.Role)
            {
                throw new InvalidOperationException($"The email {account.Email} is already in use by a different account and cannot be linked.");
            }

            if (existingUser.RestaurantId.HasValue && existingUser.RestaurantId != restaurant.Id)
            {
                throw new InvalidOperationException($"The email {account.Email} is already linked to another restaurant.");
            }

            existingUser.RestaurantId = restaurant.Id;
            existingUser.IsActivated = IsActivated(existingUser.Role, existingUser.TenantId, restaurant.Id);
        }

        await context.SaveChangesAsync(cancellationToken);

        request.RestaurantId = restaurant.Id;
        request.Status = RestaurantApprovalRequestStatus.Approved;
        request.ReviewedByUserId = currentUser.Id;
        request.ReviewedAt = DateTime.UtcNow;
        context.Notifications.Add(new Notification
        {
            UserId = request.RequestedByUserId,
            Message = $"{request.Summary} was approved by Super Admin."
        });
        await context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task<RestaurantApprovalRequest?> GetEditableCreateRequestAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("User has no tenant.");

        var request = await context.RestaurantApprovalRequests
            .Include(current => current.RequestedByUser)
            .FirstOrDefaultAsync(
                current => current.Id == id
                    && current.TenantId == tenantId
                    && current.RequestedByUserId == currentUser.Id
                    && current.Type == RestaurantApprovalRequestType.Create,
                cancellationToken);

        if (request is null)
            return null;

        if (request.Status == RestaurantApprovalRequestStatus.Approved)
            throw new InvalidOperationException("Approved requests cannot be edited.");

        return request;
    }

    private async Task<RestaurantApprovalRequestDetailDto?> GetMineDetailAsync(
        int id,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken)
    {
        var tenantId = currentUser.TenantId ?? throw new InvalidOperationException("User has no tenant.");

        var request = await context.RestaurantApprovalRequests
            .AsNoTracking()
            .Include(current => current.RequestedByUser)
            .FirstOrDefaultAsync(
                current => current.Id == id
                    && current.TenantId == tenantId
                    && current.RequestedByUserId == currentUser.Id,
                cancellationToken);

        return request is null ? null : MapDetail(request);
    }

    private static bool IsActivated(UserRole role, Guid? tenantId, int? restaurantId)
    {
        if (!tenantId.HasValue)
        {
            return false;
        }

        return role switch
        {
            UserRole.PosDevice or UserRole.TableDevice or UserRole.KitchenDevice or UserRole.HostDevice
                => restaurantId.HasValue,
            _ => true
        };
    }
}
