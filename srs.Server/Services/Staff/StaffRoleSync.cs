using srs.Server.Models.Enums;

namespace srs.Server.Services.Staff;

internal static class StaffRoleSync
{
    public static UserRole ToUserRole(StaffPosition position) =>
        position switch
        {
            StaffPosition.Host => UserRole.Host,
            StaffPosition.TableTablet => UserRole.Table,
            StaffPosition.Manager => UserRole.Manager,
            StaffPosition.Owner => UserRole.Owner,
            StaffPosition.Admin => UserRole.Admin,
            StaffPosition.SuperAdmin => UserRole.SuperAdmin,
            StaffPosition.Waiter => UserRole.User,
            StaffPosition.Chef => UserRole.User,
            _ => UserRole.User
        };

    public static StaffPosition? ToStaffPosition(UserRole role) =>
        role switch
        {
            UserRole.Host => StaffPosition.Host,
            UserRole.Table => StaffPosition.TableTablet,
            UserRole.Manager => StaffPosition.Manager,
            UserRole.Owner => StaffPosition.Owner,
            UserRole.Admin => StaffPosition.Admin,
            UserRole.SuperAdmin => StaffPosition.SuperAdmin,
            UserRole.User => null,
            _ => null
        };
}
