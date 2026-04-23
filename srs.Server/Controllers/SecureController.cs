using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/secure")]
public class SecureController : ControllerBase
{
    [Authorize]
    [HttpGet]
    public IActionResult Get()
    {
        var userId = User.FindFirst("sub")?.Value;

        return Ok(new
        {
            message = "You are authenticated",
            userId = userId,
            time = DateTime.Now
        });
    }
}