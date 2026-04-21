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
    


builder.Services.AddControllers();

var app = builder.Build();

// ✅ USE CORS
app.UseCors("AllowAll");

app.MapControllers();

app.Run();  