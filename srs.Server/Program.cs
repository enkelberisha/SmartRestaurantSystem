using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;

const string supabaseProjectUrl = "https://zicrtgcfgbiaxdwsaikx.supabase.co";

var builder = WebApplication.CreateBuilder(args);

// ✅ CORS
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

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.Authority = $"{supabaseProjectUrl}/auth/v1";

    options.TokenValidationParameters = new()
    {
        ValidateAudience = true,
        ValidateIssuer = true,
        ValidIssuer = $"{supabaseProjectUrl}/auth/v1",
        ValidAudience = "authenticated"
    };
});

builder.Services.AddAuthorization();

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ✅ Swagger
app.UseSwagger();
app.UseSwaggerUI();

// ✅ Middleware
app.UseCors("AllowAll");

app.UseAuthentication(); // 🔥 REQUIRED
app.UseAuthorization();

app.MapControllers();

app.Run();
