import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import type { CurrentProfile } from "@/lib/auth/authService";
import type { OwnerDashboardData, RestaurantScope } from "@/owner/types";

type OwnerModalsProps = {
    data: OwnerDashboardData;
    notificationsOpen: boolean;
    profile: CurrentProfile;
    profileOpen: boolean;
    restaurantPickerOpen: boolean;
    selectedRestaurantId: RestaurantScope;
    onCloseNotifications: () => void;
    onCloseProfile: () => void;
    onCloseRestaurantPicker: () => void;
    onLogout: () => void;
    onRestaurantChange: (scope: RestaurantScope) => void;
};

export function OwnerModals({
    data,
    notificationsOpen,
    profile,
    profileOpen,
    restaurantPickerOpen,
    selectedRestaurantId,
    onCloseNotifications,
    onCloseProfile,
    onCloseRestaurantPicker,
    onLogout,
    onRestaurantChange
}: OwnerModalsProps) {
    return (
        <>
            {restaurantPickerOpen && (
                <OwnerDialog title="Choose Restaurant" onClose={onCloseRestaurantPicker}>
                    <div className="admin-choice-list">
                        <button
                            type="button"
                            className={`admin-choice-list__item ${selectedRestaurantId === "all" ? "admin-choice-list__item--active" : ""}`}
                            onClick={() => onRestaurantChange("all")}
                        >
                            <span>
                                <strong>All restaurants</strong>
                                <small>See every owner record across the tenant.</small>
                            </span>
                        </button>
                        {data.restaurants.map(restaurant => (
                            <button
                                key={restaurant.id}
                                type="button"
                                className={`admin-choice-list__item ${selectedRestaurantId === restaurant.id ? "admin-choice-list__item--active" : ""}`}
                                onClick={() => onRestaurantChange(restaurant.id)}
                            >
                                <span>
                                    <strong>{restaurant.name}</strong>
                                    <small>{restaurant.location}</small>
                                </span>
                            </button>
                        ))}
                    </div>
                </OwnerDialog>
            )}

            {notificationsOpen && (
                <OwnerDialog title="Owner Notifications" onClose={onCloseNotifications}>
                    <div className="sa-activity-list">
                        <article className="sa-activity sa-activity--success">
                            <strong>Portfolio snapshot ready</strong>
                            <p>{data.restaurants.length} restaurants, {data.activeOrders} active orders, and {data.scopedReservations.length} reservations in scope.</p>
                        </article>
                        <article className="sa-activity">
                            <strong>Table tablet rollout</strong>
                            <p>{data.tabletReadyTables} tables can be prepared for menu ordering and payment sessions.</p>
                        </article>
                    </div>
                </OwnerDialog>
            )}

            {profileOpen && (
                <OwnerDialog title="Owner Profile" onClose={onCloseProfile}>
                    <div className="sa-stack">
                        <div>
                            <strong>{profile.email}</strong>
                            <p className="modal-copy">{profile.role} account</p>
                            <p className="modal-copy">Tenant: {profile.tenantId ?? "Not assigned"}</p>
                        </div>
                        <div className="sa-inline-actions">
                            <Button variant="secondary">
                                <ShieldCheck size={18} />
                                Security
                            </Button>
                            <Button onClick={onLogout}>
                                <LogOut size={18} />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </OwnerDialog>
            )}

        </>
    );
}

function OwnerDialog({
    children,
    onClose,
    title
}: {
    children: React.ReactNode;
    onClose: () => void;
    title: string;
}) {
    return (
        <div className="modal-backdrop" role="presentation">
            <div className="modal-surface" role="dialog" aria-modal="true" aria-label={title}>
                <div className="modal-surface__header">
                    <h3>{title}</h3>
                    <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title}`}>
                        <ChevronDown size={18} />
                    </button>
                </div>
                <div className="modal-surface__body">
                    {children}
                </div>
            </div>
        </div>
    );
}
