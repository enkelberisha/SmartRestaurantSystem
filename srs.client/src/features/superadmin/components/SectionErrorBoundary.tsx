import React from "react";

type SectionErrorBoundaryProps = {
    children: React.ReactNode;
};

type SectionErrorBoundaryState = {
    hasError: boolean;
};

export class SectionErrorBoundary extends React.Component<
    SectionErrorBoundaryProps,
    SectionErrorBoundaryState
> {
    public constructor(props: SectionErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    public static getDerivedStateFromError(): SectionErrorBoundaryState {
        return { hasError: true };
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="section-card section-card--error">
                    <h3>Section failed to load</h3>
                    <p>Try refreshing this area or revisit it in a moment.</p>
                </div>
            );
        }

        return this.props.children;
    }
}
