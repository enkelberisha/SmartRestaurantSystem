using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Models.Enums;
using srs.Server.Services;
using srs.Server.Services.Inventory;
using srs.Server.Services.InventoryItems;
using srs.Server.Services.KitchenQueue;
using srs.Server.Services.Reports;
using srs.Server.Services.Tenants;

const string supabaseProjectUrl = "https://zicrtgcfgbiaxdwsaikx.supabase.co";

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IRoleAccessService, RoleAccessService>();
builder.Services.AddTransient<IClaimsTransformation, AppUserClaimsTransformation>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IInventoryItemService, InventoryItemService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IKitchenQueueService, KitchenQueueService>();
builder.Services.AddScoped<ITenantService, TenantService>();

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

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
