import { useEffect, useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import {
    createRestaurant,
    getCurrentRestaurant,
    updateRestaurant,
    type Restaurant
} from "@/lib/restaurants/restaurantService";

type RestaurantSetupPageProps = {
    roleLabel: "Owner" | "Admin" | "SuperAdmin";
};

export function RestaurantSetupPage({ roleLabel }: RestaurantSetupPageProps) {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        void (async () => {
            try {
                const currentRestaurant = await getCurrentRestaurant();
                if (!isMounted) {
                    return;
                }

                setRestaurant(currentRestaurant);
                setName(currentRestaurant?.name ?? "");
                setLocation(currentRestaurant?.location ?? "");
            } catch (currentError) {
                if (isMounted) {
                    setError(currentError instanceof Error ? currentError.message : "Could not load restaurant data.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setFeedback(null);
        setIsSaving(true);

        try {
            const payload = {
                name: name.trim(),
                location: location.trim()
            };

            const savedRestaurant = restaurant
                ? await updateRestaurant(restaurant.id, payload)
                : await createRestaurant(payload);

            setRestaurant(savedRestaurant);
            setName(savedRestaurant.name);
            setLocation(savedRestaurant.location);
            setFeedback(restaurant ? "Restaurant updated." : "Restaurant created.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save restaurant data.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <main className="role-shell">
                <section className="role-card role-card--wide">
                    <p className="role-card__eyebrow">{roleLabel} Workspace</p>
                    <h1>Loading restaurant setup...</h1>
                </section>
            </main>
        );
    }

    return (
        <main className="role-shell">
            <section className="role-card role-card--wide">
                <p className="role-card__eyebrow">{roleLabel} Workspace</p>
                <h1>{restaurant ? "Edit your restaurant" : "Create your restaurant"}</h1>
                <p className="role-card__lead">
                    This is the first real setup step. Save the restaurant name and location here, and the rest of
                    the system can build from it.
                </p>

                <form className="role-form" onSubmit={handleSubmit}>
                    <Input
                        id={`${roleLabel.toLowerCase()}-restaurant-name`}
                        label="Restaurant Name"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        placeholder="Luna Bistro"
                    />

                    <Input
                        id={`${roleLabel.toLowerCase()}-restaurant-location`}
                        label="Location"
                        value={location}
                        onChange={event => setLocation(event.target.value)}
                        placeholder="Budapest, Main Street 12"
                    />

                    {error ? <p className="role-status role-status--error">{error}</p> : null}
                    {feedback ? <p className="role-status role-status--success">{feedback}</p> : null}

                    <Button type="submit" isLoading={isSaving}>
                        {restaurant ? "Save Changes" : "Create Restaurant"}
                    </Button>
                </form>
            </section>
        </main>
    );
}
