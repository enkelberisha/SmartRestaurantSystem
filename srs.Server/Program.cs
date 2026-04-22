using Microsoft.EntityFrameworkCore;
using srs.Server.Data; // adjust to your namespace

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

// ✅ Get connection string (env or appsettings)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// ❗ Register DbContext (THIS WAS MISSING)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddControllers();

var app = builder.Build();

// ✅ USE CORS
app.UseCors("AllowAll");

app.MapControllers();

app.Run();