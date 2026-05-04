using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using srs.Server.Data;
using srs.Server.Data.Interceptors;
using srs.Server.Middleware;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.AuditLogs;
using srs.Server.Services.Inventory;
using srs.Server.Services.InventoryItems;
using srs.Server.Services.KitchenQueue;
using srs.Server.Services.Reports;
using srs.Server.Services.Reservations;
using srs.Server.Services.Restaurants;
using srs.Server.Services.Superadmin;
using srs.Server.Services.Supabase;
using srs.Server.Services.Tenants;
using srs.Server.Services.Staff;
using srs.Server.Services.Users;
using srs.Server.Services.Menu;
using srs.Server.Services.MenuItems;
using srs.Server.Services.Orders;
using srs.Server.Services.OrderItems;
using srs.Server.Services.Payments;
using srs.Server.Services.Suppliers;
using srs.Server.Services.Tables;

const string supabaseProjectUrl = "https://zicrtgcfgbiaxdwsaikx.supabase.co";

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddSingleton<AuditLogInterceptor>();

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
    options
        .UseNpgsql(connectionString)
        .AddInterceptors(serviceProvider.GetRequiredService<AuditLogInterceptor>()));

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IDatabaseRlsContextService, DatabaseRlsContextService>();
builder.Services.AddScoped<IRoleAccessService, RoleAccessService>();
builder.Services.AddTransient<IClaimsTransformation, AppUserClaimsTransformation>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IInventoryItemService, InventoryItemService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IKitchenQueueService, KitchenQueueService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();
builder.Services.AddScoped<ISuperadminUserService, SuperadminUserService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITableService, TableService>();
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.AddHttpClient<ISupabaseAdminService, SupabaseAdminService>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<SupabaseOptions>>().Value;

    if (!string.IsNullOrWhiteSpace(options.Url))
    {
        client.BaseAddress = new Uri(options.Url.TrimEnd('/') + "/");
    }
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"{supabaseProjectUrl}/auth/v1";
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new()
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseProjectUrl}/auth/v1",
            ValidAudience = "authenticated"
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole(UserRole.Admin.ToString(), UserRole.SuperAdmin.ToString());
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IMenuItemService, MenuItemService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderItemService, OrderItemService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<ITableService, TableService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseMiddleware<DatabaseRlsContextMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.Run();
