using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using srs.Server.Data;
using srs.Server.Dtos.AI;
using srs.Server.Dtos.OwnerAnalytics;
using srs.Server.Services.Auth;
using srs.Server.Services.OwnerAnalytics;

namespace srs.Server.Services.AI;

public class AiInsightsService : IAiInsightsService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IOwnerAnalyticsService _ownerAnalyticsService;
    private readonly OpenAiOptions _options;

    public AiInsightsService(
        AppDbContext context,
        HttpClient httpClient,
        IOwnerAnalyticsService ownerAnalyticsService,
        IOptions<OpenAiOptions> options)
    {
        _context = context;
        _httpClient = httpClient;
        _ownerAnalyticsService = ownerAnalyticsService;
        _options = options.Value;
    }

    public async Task<AiManagerInsightsResponseDto> GenerateManagerInsightsAsync(
        AiManagerInsightsRequestDto request,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        if (currentUser.TenantId is null)
        {
            throw new InvalidOperationException("No tenant");
        }

        var visibleRestaurants = await _context.Restaurants
            .AsNoTracking()
            .Where(item => item.TenantId == currentUser.TenantId.Value)
            .ToListAsync(cancellationToken);
        var assignedRestaurants = visibleRestaurants
            .Where(item => item.ManagerId == currentUser.Id)
            .ToList();
        var accessibleRestaurants = assignedRestaurants.Count > 0 ? assignedRestaurants : visibleRestaurants;
        var restaurant = accessibleRestaurants.FirstOrDefault(item => item.Id == request.RestaurantId);

        if (restaurant is null)
        {
            throw new UnauthorizedAccessException("Restaurant not found for this manager.");
        }

        var snapshot = await BuildSnapshotAsync(restaurant.Id, cancellationToken);
        var fallback = BuildFallbackInsights(restaurant.Name, snapshot);
        fallback.Model = _options.Model;

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            fallback.IsConfigured = false;
            fallback.SmartSummary = $"OpenAI is not configured yet. {fallback.SmartSummary}";
            return fallback;
        }

        var prompt = BuildPrompt(restaurant.Name, snapshot);
        var aiText = await GenerateAiTextAsync(
            prompt,
            "You are an operational AI analyst for restaurant managers. Return valid JSON only. Do not include markdown.",
            cancellationToken);
        var parsed = ParseAiJson<AiManagerInsightsResponseDto>(aiText) ?? fallback;
        parsed.IsConfigured = true;
        parsed.Model = _options.Model;
        parsed.GeneratedAt = DateTime.UtcNow;
        return parsed;
    }

    public async Task<AiOwnerInsightsResponseDto> GenerateOwnerInsightsAsync(
        AiOwnerInsightsRequestDto request,
        CurrentUserContext currentUser,
        CancellationToken cancellationToken = default)
    {
        if (currentUser.TenantId is null)
        {
            throw new InvalidOperationException("No tenant");
        }

        var snapshot = await BuildOwnerSnapshotAsync(
            currentUser.TenantId.Value,
            request.RestaurantId,
            cancellationToken);
        var fallback = BuildFallbackOwnerInsights(snapshot);
        fallback.Model = _options.Model;

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            fallback.IsConfigured = false;
            fallback.ExecutiveSummary = $"OpenAI is not configured yet. {fallback.ExecutiveSummary}";
            return fallback;
        }

        var prompt = BuildOwnerPrompt(snapshot);
        var aiText = await GenerateAiTextAsync(
            prompt,
            "You are a strategic AI analyst for restaurant owners. Return valid JSON only. Do not include markdown.",
            cancellationToken);
        var parsed = ParseAiJson<AiOwnerInsightsResponseDto>(aiText) ?? fallback;
        parsed.IsConfigured = true;
        parsed.Model = _options.Model;
        parsed.GeneratedAt = DateTime.UtcNow;
        return parsed;
    }

    private async Task<string> GenerateAiTextAsync(
        string prompt,
        string systemPrompt,
        CancellationToken cancellationToken)
    {
        using var httpRequest = CreateAiRequest(prompt, systemPrompt);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(ParseOpenAiError(responseText));
        }

        return IsOpenRouterProvider()
            ? ExtractChatCompletionText(responseText)
            : ExtractResponseOutputText(responseText);
    }

    private HttpRequestMessage CreateAiRequest(string prompt, string systemPrompt)
    {
        if (IsOpenRouterProvider())
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
            request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://localhost:15436");
            request.Headers.TryAddWithoutValidation("X-Title", "Smart Restaurant System");
            request.Content = JsonContent.Create(new
            {
                model = _options.Model,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = systemPrompt
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                },
                temperature = 0.2
            });
            return request;
        }

        var openAiRequest = new HttpRequestMessage(HttpMethod.Post, "responses");
        openAiRequest.Content = JsonContent.Create(new
        {
            model = _options.Model,
            instructions = systemPrompt,
            input = prompt
        });
        return openAiRequest;
    }

    private bool IsOpenRouterProvider()
    {
        return string.Equals(_options.Provider, "OpenRouter", StringComparison.OrdinalIgnoreCase) ||
            _options.BaseUrl.Contains("openrouter.ai", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<RestaurantInsightSnapshot> BuildSnapshotAsync(int restaurantId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var weekStart = now.AddDays(-7);
        var monthStart = now.AddDays(-30);

        var tables = await _context.Tables
            .AsNoTracking()
            .Where(table => table.RestaurantId == restaurantId)
            .OrderBy(table => table.Number)
            .Select(table => new TableSnapshot(table.Id, table.Number, table.Capacity, table.Status.ToString()))
            .ToListAsync(cancellationToken);
        var tableIds = tables.Select(table => table.Id).ToList();

        var orders = await _context.Orders
            .AsNoTracking()
            .Where(order => tableIds.Contains(order.TableId) && order.CreatedAt >= weekStart)
            .OrderByDescending(order => order.CreatedAt)
            .Select(order => new OrderSnapshot(order.Id, order.TableId, order.Status.ToString(), order.Total, order.CreatedAt))
            .ToListAsync(cancellationToken);
        var orderIds = orders.Select(order => order.Id).ToList();

        var orderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(item => orderIds.Contains(item.OrderId))
            .Select(item => new OrderItemSnapshot(
                item.OrderId,
                item.MenuItemId,
                item.MenuItem.Name,
                item.Quantity,
                item.Price,
                item.Notes))
            .ToListAsync(cancellationToken);

        var menuItems = await _context.MenuItems
            .AsNoTracking()
            .Where(item => item.Menu.RestaurantId == restaurantId)
            .Select(item => new MenuItemSnapshot(item.Id, item.Name, item.Price, item.Description, item.ImageUrl != null))
            .ToListAsync(cancellationToken);

        var inventoryItems = await _context.InventoryItems
            .AsNoTracking()
            .Where(item => item.Inventory.RestaurantId == restaurantId)
            .OrderBy(item => item.Quantity)
            .Select(item => new InventorySnapshot(
                item.ItemName,
                item.Quantity,
                item.UnitPrice,
                item.Supplier == null ? null : item.Supplier.Name))
            .ToListAsync(cancellationToken);

        var purchaseOrders = await _context.PurchaseOrders
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurantId && item.CreatedAt >= monthStart)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new PurchaseOrderSnapshot(item.Id, item.Supplier.Name, item.Total, item.CreatedAt))
            .ToListAsync(cancellationToken);

        return new RestaurantInsightSnapshot(now, tables, orders, orderItems, menuItems, inventoryItems, purchaseOrders);
    }

    private async Task<OwnerInsightSnapshot> BuildOwnerSnapshotAsync(
        Guid tenantId,
        int? restaurantId,
        CancellationToken cancellationToken)
    {
        var restaurantQuery = _context.Restaurants
            .AsNoTracking()
            .Where(restaurant => restaurant.TenantId == tenantId);

        if (restaurantId.HasValue)
        {
            restaurantQuery = restaurantQuery.Where(restaurant => restaurant.Id == restaurantId.Value);
        }

        var restaurants = await restaurantQuery
            .OrderBy(restaurant => restaurant.Name)
            .Select(restaurant => new OwnerRestaurantIdentity(
                restaurant.Id,
                restaurant.Name,
                restaurant.Location))
            .ToListAsync(cancellationToken);

        if (restaurants.Count == 0)
        {
            throw new UnauthorizedAccessException("Restaurant not found for this owner.");
        }

        var analytics = await _ownerAnalyticsService.GetAsync(tenantId, restaurantId, cancellationToken);
        var analyticsByRestaurantId = analytics.Restaurants.ToDictionary(item => item.RestaurantId);
        var restaurantPerformance = restaurants
            .Select(restaurant =>
            {
                analyticsByRestaurantId.TryGetValue(restaurant.Id, out var restaurantAnalytics);

                return new OwnerRestaurantPerformanceSnapshot(
                    restaurant.Id,
                    restaurant.Name,
                    restaurant.Location,
                    restaurantAnalytics?.BookedRevenue ?? 0,
                    restaurantAnalytics?.PaidRevenue ?? 0,
                    restaurantAnalytics?.OpenOrderValue ?? 0,
                    restaurantAnalytics?.GapToForecast,
                    restaurantAnalytics?.GapToBudget,
                    restaurantAnalytics?.PaceToPriorYear,
                    restaurantAnalytics?.ProjectedMonthEndRevenue,
                    restaurantAnalytics?.OccupancyRate ?? 0,
                    restaurantAnalytics?.PaymentCaptureRate ?? 0,
                    restaurantAnalytics?.CompletionRate ?? 0,
                    restaurantAnalytics?.ActiveOrders ?? 0,
                    restaurantAnalytics?.CancelledOrders ?? 0,
                    restaurantAnalytics?.LowStockItems ?? 0,
                    restaurantAnalytics?.OutOfStockItems ?? 0,
                    restaurantAnalytics?.RecentPurchaseOrderSpend ?? 0);
            })
            .OrderByDescending(restaurant => restaurant.BookedRevenue)
            .ToList();

        var scopeName = restaurantId.HasValue ? restaurants[0].Name : "Restaurant Portfolio";

        return new OwnerInsightSnapshot(
            DateTime.UtcNow,
            scopeName,
            restaurantId,
            analytics,
            restaurantPerformance);
    }

    private static AiManagerInsightsResponseDto BuildFallbackInsights(string restaurantName, RestaurantInsightSnapshot snapshot)
    {
        var today = snapshot.GeneratedAt.Date;
        var todaysOrders = snapshot.Orders.Where(order => order.CreatedAt >= today).ToList();
        var activeOrders = snapshot.Orders.Where(order => order.Status is "Pending" or "InProgress" or "Ready").ToList();
        var dishPerformance = BuildDishPerformance(snapshot);
        var menuDoctor = BuildMenuDoctor(snapshot, dishPerformance);
        var restock = BuildRestockInsights(snapshot, dishPerformance);
        var dailyRevenue = snapshot.Orders
            .GroupBy(order => order.CreatedAt.Date)
            .OrderBy(group => group.Key)
            .Select(group => new { Date = group.Key, Revenue = group.Sum(order => order.Total), Orders = group.Count() })
            .ToList();
        var activeDays = dailyRevenue.Count(day => day.Orders > 0);

        return new AiManagerInsightsResponseDto
        {
            IsConfigured = true,
            SmartSummary = $"{restaurantName} has {todaysOrders.Count} orders today and {activeOrders.Count} active kitchen orders. Weekly revenue is {snapshot.Orders.Sum(order => order.Total):0.00}, with {dishPerformance.FirstOrDefault()?.ItemName ?? "no menu item"} currently leading menu performance.",
            MenuDoctor = menuDoctor,
            RestockIntelligence = restock,
            RevenueStory = activeDays <= 1
                ? "Revenue activity is concentrated on one day this week. Consider weekday promotions or table offers to create steadier demand."
                : $"Revenue appears across {activeDays} active days this week, with the strongest day generating {dailyRevenue.OrderByDescending(day => day.Revenue).FirstOrDefault()?.Revenue ?? 0:0.00}.",
            ActionItems =
            [
                activeOrders.Count > 0 ? $"Review {activeOrders.Count} active orders before the next rush." : "No active orders need immediate kitchen follow-up.",
                restock.Count > 0 ? $"Check restock needs for {restock[0].ItemName}." : "Inventory does not show urgent stock risk from the current data.",
                menuDoctor.Any(item => item.Status != "healthy") ? "Review weak menu items for price, photo, or description improvements." : "Keep current menu promotion focused on the strongest sellers."
            ],
            GeneratedAt = DateTime.UtcNow
        };
    }

    private static AiOwnerInsightsResponseDto BuildFallbackOwnerInsights(OwnerInsightSnapshot snapshot)
    {
        var analytics = snapshot.Analytics;
        var restaurantDoctor = BuildRestaurantDoctor(snapshot);
        var riskBoard = BuildOwnerRiskBoard(snapshot);
        var topRestaurant = snapshot.Restaurants.FirstOrDefault();
        var weakRestaurant = snapshot.Restaurants
            .OrderBy(restaurant => restaurant.GapToForecast ?? decimal.MaxValue)
            .ThenBy(restaurant => restaurant.PaymentCaptureRate)
            .FirstOrDefault();

        var topRestaurantText = topRestaurant is null
            ? "no restaurant has revenue data yet"
            : $"{topRestaurant.Name} is leading with {topRestaurant.BookedRevenue:0.00} booked revenue";
        var riskText = weakRestaurant is null
            ? "no restaurant-level risk is available yet"
            : $"{weakRestaurant.Name} needs attention around forecast, payment capture, or stock risk";

        return new AiOwnerInsightsResponseDto
        {
            IsConfigured = true,
            ExecutiveSummary = $"{snapshot.ScopeName} has {analytics.BookedRevenue:0.00} booked revenue, {analytics.PaidRevenue:0.00} collected revenue, and {analytics.ActiveOrders} active orders. {topRestaurantText}, while {riskText}.",
            RestaurantDoctor = restaurantDoctor,
            FinancialStory = BuildFallbackOwnerFinancialStory(snapshot),
            RiskBoard = riskBoard,
            ActionPlan =
            [
                analytics.OpenOrderValue > 0
                    ? $"Close or review {analytics.OpenOrderValue:0.00} in open check value so booked revenue converts into paid revenue."
                    : "Keep payment hygiene stable; no open check value is blocking collected revenue.",
                analytics.GapToForecast < 0
                    ? "Review forecast gap and add a short-term sales push for the weakest restaurant."
                    : "Protect the current forecast pace and avoid unnecessary discounting.",
                analytics.LowStockItems > 0 || analytics.OutOfStockItems > 0
                    ? "Review low-stock and out-of-stock items before approving more purchase spend."
                    : "Inventory risk is low; keep monitoring supplier spend."
            ],
            GeneratedAt = DateTime.UtcNow
        };
    }

    private static List<AiRestaurantDoctorItemDto> BuildRestaurantDoctor(OwnerInsightSnapshot snapshot)
    {
        return snapshot.Restaurants
            .Take(8)
            .Select(restaurant =>
            {
                var status = GetRestaurantStatus(restaurant);
                var recommendation = status switch
                {
                    "critical" => "Prioritize this location this week: inspect revenue gap, unpaid checks, staff flow, and stockouts before adding new spend.",
                    "warning" => "Watch this restaurant closely and assign one concrete action around payment capture, occupancy, or inventory.",
                    _ => "Keep this restaurant as a benchmark and copy what is working into weaker locations."
                };

                return new AiRestaurantDoctorItemDto
                {
                    RestaurantName = restaurant.Name,
                    Status = status,
                    Insight = $"{restaurant.Name} booked {restaurant.BookedRevenue:0.00}, captured {restaurant.PaymentCaptureRate:0.#}% of payments, and has {restaurant.OccupancyRate:0.#}% occupancy.",
                    Recommendation = recommendation,
                    Revenue = restaurant.BookedRevenue,
                    GapToForecast = restaurant.GapToForecast,
                    OccupancyRate = restaurant.OccupancyRate,
                    PaymentCaptureRate = restaurant.PaymentCaptureRate,
                    LowStockItems = restaurant.LowStockItems + restaurant.OutOfStockItems
                };
            })
            .ToList();
    }

    private static List<AiOwnerRiskItemDto> BuildOwnerRiskBoard(OwnerInsightSnapshot snapshot)
    {
        var analytics = snapshot.Analytics;
        var inventorySeverity = analytics.OutOfStockItems > 0
            ? "critical"
            : analytics.LowStockItems > 0 ? "warning" : "normal";
        var forecastSeverity = analytics.GapToForecast < 0 ? "warning" : "normal";
        var paymentSeverity = analytics.OpenOrderValue > 0 && analytics.PaymentCaptureRate < 85 ? "warning" : "normal";
        var operationsSeverity = analytics.CancelledOrders > 0 || analytics.OccupancyRate < 35 ? "warning" : "normal";

        return
        [
            new()
            {
                Title = "Forecast Position",
                Severity = forecastSeverity,
                Insight = $"Projected month-end revenue is {FormatNullableMoney(analytics.ProjectedMonthEndRevenue)} with a forecast gap of {FormatNullableMoney(analytics.GapToForecast)}.",
                Recommendation = forecastSeverity == "normal"
                    ? "Keep the current pace and monitor whether the strongest locations can sustain the run rate."
                    : "Use the weakest location from Restaurant Doctor as the first target for a revenue recovery action."
            },
            new()
            {
                Title = "Payment Capture",
                Severity = paymentSeverity,
                Insight = $"{analytics.OpenOrderValue:0.00} remains in open order value and payment capture is {analytics.PaymentCaptureRate:0.#}%.",
                Recommendation = paymentSeverity == "normal"
                    ? "Payment capture looks controlled; keep closing checks quickly."
                    : "Ask managers to close open checks before end of service and review unpaid or stuck orders."
            },
            new()
            {
                Title = "Inventory Exposure",
                Severity = inventorySeverity,
                Insight = $"{analytics.LowStockItems} items are low stock, {analytics.OutOfStockItems} are out of stock, and recent purchase spend is {analytics.RecentPurchaseOrderSpend:0.00}.",
                Recommendation = inventorySeverity == "normal"
                    ? "Do not over-order; inventory coverage looks stable from the latest snapshot."
                    : "Approve restock only for the highest-risk items and compare it with recent purchase spend."
            },
            new()
            {
                Title = "Service Health",
                Severity = operationsSeverity,
                Insight = $"{analytics.ActiveOrders} orders are active, {analytics.CancelledOrders} were cancelled, and occupancy is {analytics.OccupancyRate:0.#}%.",
                Recommendation = operationsSeverity == "normal"
                    ? "Service flow looks stable for the current scope."
                    : "Review low occupancy or cancelled orders with the responsible manager before the next service."
            }
        ];
    }

    private static string BuildFallbackOwnerFinancialStory(OwnerInsightSnapshot snapshot)
    {
        var analytics = snapshot.Analytics;
        var trend = analytics.RevenueTrendData
            .OrderByDescending(item => item.Actual)
            .FirstOrDefault();
        var trendText = trend is null
            ? "There is not enough trend data yet to explain the revenue curve."
            : $"{trend.Name} is the strongest visible revenue window with {trend.Actual:0.00} actual revenue.";

        return $"{trendText} Booked revenue is {analytics.BookedRevenue:0.00}, collected revenue is {analytics.PaidRevenue:0.00}, and the projected close is {FormatNullableMoney(analytics.ProjectedMonthEndRevenue)}.";
    }

    private static string GetRestaurantStatus(OwnerRestaurantPerformanceSnapshot restaurant)
    {
        if (restaurant.GapToForecast < 0 || restaurant.OutOfStockItems > 0 || restaurant.PaymentCaptureRate < 65)
        {
            return "critical";
        }

        if (restaurant.OccupancyRate < 45 || restaurant.LowStockItems > 0 || restaurant.PaymentCaptureRate < 85 || restaurant.CancelledOrders > 0)
        {
            return "warning";
        }

        return "healthy";
    }

    private static string FormatNullableMoney(decimal? value)
    {
        return value.HasValue ? value.Value.ToString("0.00") : "not available";
    }

    private static List<DishPerformance> BuildDishPerformance(RestaurantInsightSnapshot snapshot)
    {
        return snapshot.MenuItems
            .Select(menuItem =>
            {
                var sales = snapshot.OrderItems.Where(item => item.MenuItemId == menuItem.Id).ToList();
                return new DishPerformance(
                    menuItem.Name,
                    sales.Sum(item => item.Quantity),
                    sales.Sum(item => item.Quantity * item.Price),
                    menuItem.Price,
                    menuItem.HasImage,
                    string.IsNullOrWhiteSpace(menuItem.Description));
            })
            .OrderByDescending(item => item.QuantitySold)
            .ThenByDescending(item => item.Revenue)
            .ToList();
    }

    private static List<AiMenuDoctorItemDto> BuildMenuDoctor(RestaurantInsightSnapshot snapshot, List<DishPerformance> dishPerformance)
    {
        if (dishPerformance.Count == 0)
        {
            return [];
        }

        var bestSeller = Math.Max(1, dishPerformance.Max(item => item.QuantitySold));

        return dishPerformance
            .Take(10)
            .Select(item =>
            {
                var salesRatio = item.QuantitySold / (decimal)bestSeller;
                var status = salesRatio < 0.15m ? "critical" : salesRatio < 0.35m ? "warning" : "healthy";
                var missingContent = item.MissingDescription || !item.HasImage;
                var recommendation = status switch
                {
                    "critical" => missingContent
                        ? "Add a stronger description and photo, then consider a limited discount."
                        : "Review price and placement because sales are far behind the top item.",
                    "warning" => missingContent
                        ? "Improve the description or photo to make the item easier to sell."
                        : "Monitor sales and consider pairing it with a stronger item.",
                    _ => "Keep this item visible because it is performing well."
                };

                return new AiMenuDoctorItemDto
                {
                    ItemName = item.ItemName,
                    Status = status,
                    Insight = $"{item.ItemName} sold {item.QuantitySold} units this week and generated {item.Revenue:0.00}.",
                    Recommendation = recommendation,
                    QuantitySold = item.QuantitySold,
                    Revenue = item.Revenue
                };
            })
            .ToList();
    }

    private static List<AiRestockInsightDto> BuildRestockInsights(RestaurantInsightSnapshot snapshot, List<DishPerformance> dishPerformance)
    {
        var demandSignal = Math.Max(1, dishPerformance.Sum(item => item.QuantitySold));
        var demandPerDay = Math.Max(1m, demandSignal / 7m);

        return snapshot.InventoryItems
            .OrderBy(item => item.Quantity)
            .Take(8)
            .Select(item =>
            {
                var urgency = item.Quantity <= 2 ? "critical" : item.Quantity <= 5 ? "warning" : "normal";
                var supplier = string.IsNullOrWhiteSpace(item.SupplierName) ? "the supplier" : item.SupplierName;
                var daysEstimate = item.Quantity <= 0 ? "now" : $"{Math.Max(1m, Math.Ceiling(item.Quantity / demandPerDay)):0} days";

                return new AiRestockInsightDto
                {
                    ItemName = item.ItemName,
                    Urgency = urgency,
                    Quantity = item.Quantity,
                    SupplierName = item.SupplierName,
                    Insight = $"{item.ItemName} has {item.Quantity:0.##} units left. Based on weekly order demand, this may become a risk in about {daysEstimate}.",
                    Recommendation = urgency == "normal"
                        ? $"Monitor {item.ItemName}; no urgent purchase order is required yet."
                        : $"Prepare a purchase order from {supplier} before the next busy service."
                };
            })
            .ToList();
    }

    private static string BuildPrompt(string restaurantName, RestaurantInsightSnapshot snapshot)
    {
        var compactSnapshot = new
        {
            restaurantName,
            generatedAtUtc = snapshot.GeneratedAt,
            ordersLast7Days = snapshot.Orders,
            menuItems = snapshot.MenuItems,
            orderItemsLast7Days = snapshot.OrderItems,
            inventory = snapshot.InventoryItems,
            purchaseOrdersLast30Days = snapshot.PurchaseOrders,
            tables = snapshot.Tables
        };

        var builder = new StringBuilder();
        builder.AppendLine("Analyze this restaurant data for a manager.");
        builder.AppendLine();
        builder.AppendLine("Return JSON only in this exact shape:");
        builder.AppendLine("{");
        builder.AppendLine("  \"smartSummary\": \"2-3 sentences about the current business situation.\",");
        builder.AppendLine("  \"menuDoctor\": [");
        builder.AppendLine("    {");
        builder.AppendLine("      \"itemName\": \"Dish name\",");
        builder.AppendLine("      \"status\": \"healthy|warning|critical\",");
        builder.AppendLine("      \"insight\": \"What the data shows.\",");
        builder.AppendLine("      \"recommendation\": \"Specific manager action.\",");
        builder.AppendLine("      \"quantitySold\": 0,");
        builder.AppendLine("      \"revenue\": 0");
        builder.AppendLine("    }");
        builder.AppendLine("  ],");
        builder.AppendLine("  \"restockIntelligence\": [");
        builder.AppendLine("    {");
        builder.AppendLine("      \"itemName\": \"Inventory item\",");
        builder.AppendLine("      \"urgency\": \"normal|warning|critical\",");
        builder.AppendLine("      \"insight\": \"Why stock needs attention and timing.\",");
        builder.AppendLine("      \"recommendation\": \"Specific reorder action.\",");
        builder.AppendLine("      \"quantity\": 0,");
        builder.AppendLine("      \"supplierName\": \"Supplier name or null\"");
        builder.AppendLine("    }");
        builder.AppendLine("  ],");
        builder.AppendLine("  \"revenueStory\": \"Explain the weekly revenue pattern in plain language.\",");
        builder.AppendLine("  \"actionItems\": [\"Short manager action\", \"Short manager action\", \"Short manager action\"]");
        builder.AppendLine("}");
        builder.AppendLine();
        builder.AppendLine("Restaurant data:");
        builder.AppendLine(JsonSerializer.Serialize(compactSnapshot, JsonOptions));
        return builder.ToString();
    }

    private static string BuildOwnerPrompt(OwnerInsightSnapshot snapshot)
    {
        var compactSnapshot = new
        {
            scopeName = snapshot.ScopeName,
            generatedAtUtc = snapshot.GeneratedAt,
            selectedRestaurantId = snapshot.RestaurantId,
            portfolio = new
            {
                snapshot.Analytics.BookedRevenue,
                snapshot.Analytics.PaidRevenue,
                snapshot.Analytics.OpenOrderValue,
                snapshot.Analytics.CancelledRevenue,
                snapshot.Analytics.AverageTicket,
                snapshot.Analytics.Adr,
                snapshot.Analytics.ActiveOrders,
                snapshot.Analytics.CompletedOrders,
                snapshot.Analytics.CancelledOrders,
                snapshot.Analytics.OccupancyRate,
                snapshot.Analytics.PaymentCaptureRate,
                snapshot.Analytics.CompletionRate,
                snapshot.Analytics.InventoryValue,
                snapshot.Analytics.LowStockItems,
                snapshot.Analytics.OutOfStockItems,
                snapshot.Analytics.RecentPurchaseOrderSpend,
                snapshot.Analytics.RevenueForecast,
                snapshot.Analytics.GapToForecast,
                snapshot.Analytics.RevenueBudget,
                snapshot.Analytics.GapToBudget,
                snapshot.Analytics.PriorYearRevenue,
                snapshot.Analytics.PaceToPriorYear,
                snapshot.Analytics.ProjectedMonthEndRevenue
            },
            restaurants = snapshot.Restaurants,
            revenueTrend = snapshot.Analytics.RevenueTrendData,
            forecastBridge = snapshot.Analytics.ForecastBridgeData
        };

        var builder = new StringBuilder();
        builder.AppendLine("Analyze this restaurant owner dashboard data.");
        builder.AppendLine("Speak like a strategic owner assistant: clear, direct, and action-oriented.");
        builder.AppendLine();
        builder.AppendLine("Return JSON only in this exact shape:");
        builder.AppendLine("{");
        builder.AppendLine("  \"executiveSummary\": \"2-3 sentences about the portfolio or selected restaurant.\",");
        builder.AppendLine("  \"restaurantDoctor\": [");
        builder.AppendLine("    {");
        builder.AppendLine("      \"restaurantName\": \"Restaurant name\",");
        builder.AppendLine("      \"status\": \"healthy|warning|critical\",");
        builder.AppendLine("      \"insight\": \"What the data shows.\",");
        builder.AppendLine("      \"recommendation\": \"Specific owner action.\",");
        builder.AppendLine("      \"revenue\": 0,");
        builder.AppendLine("      \"gapToForecast\": 0,");
        builder.AppendLine("      \"occupancyRate\": 0,");
        builder.AppendLine("      \"paymentCaptureRate\": 0,");
        builder.AppendLine("      \"lowStockItems\": 0");
        builder.AppendLine("    }");
        builder.AppendLine("  ],");
        builder.AppendLine("  \"financialStory\": \"Explain revenue, forecast, budget, and prior-year pace in plain language.\",");
        builder.AppendLine("  \"riskBoard\": [");
        builder.AppendLine("    {");
        builder.AppendLine("      \"title\": \"Risk title\",");
        builder.AppendLine("      \"severity\": \"normal|warning|critical\",");
        builder.AppendLine("      \"insight\": \"Why this risk matters.\",");
        builder.AppendLine("      \"recommendation\": \"Specific next action.\"");
        builder.AppendLine("    }");
        builder.AppendLine("  ],");
        builder.AppendLine("  \"actionPlan\": [\"Short owner action\", \"Short owner action\", \"Short owner action\"]");
        builder.AppendLine("}");
        builder.AppendLine();
        builder.AppendLine("Owner dashboard data:");
        builder.AppendLine(JsonSerializer.Serialize(compactSnapshot, JsonOptions));
        return builder.ToString();
    }

    private static T? ParseAiJson<T>(string text) where T : class
    {
        try
        {
            var cleaned = text.Trim();
            if (cleaned.StartsWith("```", StringComparison.Ordinal))
            {
                cleaned = cleaned.Trim('`').Trim();
                cleaned = cleaned.StartsWith("json", StringComparison.OrdinalIgnoreCase)
                    ? cleaned[4..].Trim()
                    : cleaned;
            }

            return JsonSerializer.Deserialize<T>(cleaned, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string ExtractResponseOutputText(string responseText)
    {
        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;

        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            return outputText.GetString() ?? string.Empty;
        }

        if (!root.TryGetProperty("output", out var output) || output.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var contentItem in content.EnumerateArray())
            {
                if (contentItem.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
                {
                    return text.GetString() ?? string.Empty;
                }
            }
        }

        return string.Empty;
    }

    private static string ExtractChatCompletionText(string responseText)
    {
        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;

        if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        foreach (var choice in choices.EnumerateArray())
        {
            if (choice.TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var content) &&
                content.ValueKind == JsonValueKind.String)
            {
                return content.GetString() ?? string.Empty;
            }
        }

        return string.Empty;
    }

    private static string ParseOpenAiError(string responseText)
    {
        try
        {
            using var document = JsonDocument.Parse(responseText);
            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                return message.GetString() ?? "OpenAI request failed.";
            }
        }
        catch (JsonException)
        {
            return string.IsNullOrWhiteSpace(responseText) ? "OpenAI request failed." : responseText;
        }

        return string.IsNullOrWhiteSpace(responseText) ? "OpenAI request failed." : responseText;
    }

    private sealed record RestaurantInsightSnapshot(
        DateTime GeneratedAt,
        List<TableSnapshot> Tables,
        List<OrderSnapshot> Orders,
        List<OrderItemSnapshot> OrderItems,
        List<MenuItemSnapshot> MenuItems,
        List<InventorySnapshot> InventoryItems,
        List<PurchaseOrderSnapshot> PurchaseOrders);

    private sealed record TableSnapshot(int Id, int Number, int Capacity, string Status);
    private sealed record OrderSnapshot(int Id, int TableId, string Status, decimal Total, DateTime CreatedAt);
    private sealed record OrderItemSnapshot(int OrderId, int MenuItemId, string MenuItemName, int Quantity, decimal Price, string? Notes);
    private sealed record MenuItemSnapshot(int Id, string Name, decimal Price, string? Description, bool HasImage);
    private sealed record InventorySnapshot(string ItemName, decimal Quantity, decimal UnitPrice, string? SupplierName);
    private sealed record PurchaseOrderSnapshot(int Id, string SupplierName, decimal Total, DateTime CreatedAt);
    private sealed record DishPerformance(string ItemName, int QuantitySold, decimal Revenue, decimal Price, bool HasImage, bool MissingDescription);
    private sealed record OwnerInsightSnapshot(
        DateTime GeneratedAt,
        string ScopeName,
        int? RestaurantId,
        OwnerAnalyticsResponseDto Analytics,
        List<OwnerRestaurantPerformanceSnapshot> Restaurants);
    private sealed record OwnerRestaurantIdentity(int Id, string Name, string Location);
    private sealed record OwnerRestaurantPerformanceSnapshot(
        int Id,
        string Name,
        string Location,
        decimal BookedRevenue,
        decimal PaidRevenue,
        decimal OpenOrderValue,
        decimal? GapToForecast,
        decimal? GapToBudget,
        decimal? PaceToPriorYear,
        decimal? ProjectedMonthEndRevenue,
        decimal OccupancyRate,
        decimal PaymentCaptureRate,
        decimal CompletionRate,
        int ActiveOrders,
        int CancelledOrders,
        int LowStockItems,
        int OutOfStockItems,
        decimal RecentPurchaseOrderSpend);
}
