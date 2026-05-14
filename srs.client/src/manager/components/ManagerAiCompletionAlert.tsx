import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getLatestManagerAiInsightsJob } from "@/manager/services/aiInsightsService";
import { getStoredManagerRestaurantId } from "@/manager/services/managerRestaurantService";

export function ManagerAiCompletionAlert() {
    const [isOpen, setIsOpen] = useState(false);
    const notifiedJobIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        let isMounted = true;
        const intervalId = window.setInterval(async () => {
            const restaurantId = getStoredManagerRestaurantId();

            if (!restaurantId) {
                return;
            }

            try {
                const latestJob = await getLatestManagerAiInsightsJob(restaurantId);

                if (
                    isMounted &&
                    latestJob?.status === "completed" &&
                    latestJob.result &&
                    !notifiedJobIds.current.has(latestJob.jobId)
                ) {
                    notifiedJobIds.current.add(latestJob.jobId);
                    setIsOpen(true);
                }
            } catch {
                // The AI page shows detailed errors; background polling should stay quiet.
            }
        }, 3000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    if (!isOpen) {
        return null;
    }

    return (
        <section className="manager-ai-complete-alert" role="alert">
            <CheckCircle2 size={22} />
            <div>
                <strong>AI Insights are ready</strong>
                <p>The background AI job finished. Open AI Insights to review the suggestions.</p>
            </div>
            <a href="/manager/ai-insights">Open AI Insights</a>
            <button
                type="button"
                className="manager-ai-complete-alert__close"
                aria-label="Dismiss AI insights alert"
                onClick={() => setIsOpen(false)}
            >
                ×
            </button>
        </section>
    );
}
