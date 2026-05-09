import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { OwnerDashboardData, PortfolioRow } from "@/features/owner/types";
import { formatCurrency } from "@/features/owner/ownerUtils";

type SortKey = "name" | "revenue" | "openOrders" | "staff";

export function PortfolioTab({ data }: { data: OwnerDashboardData }) {
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("revenue");

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const rows = normalizedQuery
            ? data.portfolioRows.filter(row =>
                row.name.toLowerCase().includes(normalizedQuery) ||
                row.location.toLowerCase().includes(normalizedQuery)
            )
            : data.portfolioRows;

        return [...rows].sort((first, second) => sortPortfolioRows(first, second, sortKey));
    }, [data.portfolioRows, query, sortKey]);

    return (
        <section className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Restaurant Portfolio</h3>
                    <p>Ownership view across locations, teams, menu coverage, orders, and revenue</p>
                </div>
                <div className="owner-portfolio-toolbar">
                    <label className="admin-search admin-search--inline">
                        <Search size={16} />
                        <input
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Find restaurant..."
                        />
                    </label>
                    <div className="owner-sort-tabs" aria-label="Sort restaurants">
                        <SortButton label="Revenue" value="revenue" current={sortKey} onChange={setSortKey} />
                        <SortButton label="Open Orders" value="openOrders" current={sortKey} onChange={setSortKey} />
                        <SortButton label="Staff" value="staff" current={sortKey} onChange={setSortKey} />
                        <SortButton label="Name" value="name" current={sortKey} onChange={setSortKey} />
                    </div>
                </div>
            </header>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Restaurant</th>
                            <th>Location</th>
                            <th>Tables</th>
                            <th>Staff</th>
                            <th>Menu Items</th>
                            <th>Open Orders</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map(row => (
                            <tr key={row.id}>
                                <td>{row.name}</td>
                                <td>{row.location}</td>
                                <td>{row.tables}</td>
                                <td>{row.staff}</td>
                                <td>{row.menuItems}</td>
                                <td><span className="admin-badge">{row.openOrders}</span></td>
                                <td>{formatCurrency(row.revenue)}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="admin-empty-cell">No restaurants match this filter.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function SortButton({
    current,
    label,
    onChange,
    value
}: {
    current: SortKey;
    label: string;
    onChange: (value: SortKey) => void;
    value: SortKey;
}) {
    return (
        <button
            type="button"
            className={`owner-sort-tab ${current === value ? "owner-sort-tab--active" : ""}`}
            onClick={() => onChange(value)}
        >
            {label}
        </button>
    );
}

function sortPortfolioRows(first: PortfolioRow, second: PortfolioRow, sortKey: SortKey) {
    if (sortKey === "name") {
        return first.name.localeCompare(second.name);
    }

    return second[sortKey] - first[sortKey];
}
