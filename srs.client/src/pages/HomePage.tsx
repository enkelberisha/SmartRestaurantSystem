import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

export function HomePage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <main className="home-shell">
            <div className="home-surface">
                <header className="home-header">
                    <Link to="/" className="brand-mark">
                        <span className="brand-mark__icon">sr</span>
                        <span className="brand-mark__text">SmartRestaurantSystem</span>
                    </Link>

                    <nav className="home-nav" aria-label="Primary navigation">
                        <a href="#features">Features</a>
                        <a href="#solutions">Solutions</a>
                        <a href="#resources">Resources</a>
                    </nav>

                    <div className="home-header__actions">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <Link to="/login" className="home-link">
                            <Button variant="secondary">Sign In Now</Button>
                        </Link>
                        <Link to="/register" className="home-link">
                            <Button>Create Free Account</Button>
                        </Link>
                    </div>
                </header>

                <section className="hero-section">
                    <div className="hero-copy">
                        <p className="hero-copy__eyebrow">Modern restaurant operations, menus, and ordering</p>
                        <h1>Modern Restaurant Solutions for menu, website, and orders.</h1>
                        <p className="hero-copy__lead">
                            Set up your digital menu, guest-facing website, and online ordering flow in one calm
                            workspace. Built for restaurants that want faster service without extra chaos.
                        </p>

                        <div className="hero-copy__actions">
                            <Link to="/register" className="home-link">
                                <Button>Start Your Free Setup</Button>
                            </Link>
                            <Link to="/login" className="home-link">
                                <Button variant="ghost">Open Restaurant Dashboard</Button>
                            </Link>
                        </div>
                    </div>

                    <div className="hero-metrics" id="features">
                        <article className="hero-metric">
                            <h2>Showcase information</h2>
                            <p>Present your menu, opening hours, location, and featured dishes in one refined page.</p>
                        </article>
                        <article className="hero-metric">
                            <h2>Attract customers</h2>
                            <p>Use digital menus, QR ordering, and a clean ordering flow that feels premium.</p>
                        </article>
                        <article className="hero-metric">
                            <h2>Drive sales</h2>
                            <p>Turn casual visitors into paying guests with better browsing, faster ordering, and less friction.</p>
                        </article>
                    </div>
                </section>

                <section className="showcase-section" id="solutions">
                    <div className="dashboard-frame" aria-label="Product showcase preview">
                        <div className="dashboard-frame__header">
                            <div className="dashboard-frame__brand">
                                <span className="dashboard-frame__logo">sr</span>
                                <span>Smart Restaurant System</span>
                            </div>
                            <div className="dashboard-frame__status">Live Preview</div>
                        </div>

                        <div className="dashboard-frame__body">
                            <aside className="dashboard-sidebar">
                                <span className="dashboard-sidebar__title">Workspace</span>
                                <div className="dashboard-sidebar__item" />
                                <div className="dashboard-sidebar__item" />
                                <div className="dashboard-sidebar__item" />
                                <div className="dashboard-sidebar__item" />
                                <div className="dashboard-sidebar__item dashboard-sidebar__item--active" />
                            </aside>

                            <div className="dashboard-main">
                                <div className="dashboard-main__headline">
                                    <h2>Showcase information</h2>
                                    <p>Brand customization, ordering setup, and menu publishing from one panel.</p>
                                </div>

                                <div className="dashboard-grid">
                                    <article className="dashboard-card">
                                        <span>Brand Customization</span>
                                        <strong>Primary colors</strong>
                                        <div className="dashboard-swatches">
                                            <i />
                                            <i />
                                            <i />
                                        </div>
                                    </article>

                                    <article className="dashboard-card dashboard-card--upload">
                                        <span>Brand Logo</span>
                                        <strong>Choose file</strong>
                                        <p>Drag logo assets here or upload a clean square mark.</p>
                                    </article>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="trust-strip">
                    <article>
                        <span>Fast launch</span>
                        <strong>Get a polished restaurant front online in a day, not weeks.</strong>
                    </article>
                    <article>
                        <span>Built for teams</span>
                        <strong>Separate access for managers, staff, and admins without messy workarounds.</strong>
                    </article>
                    <article>
                        <span>Mobile ready</span>
                        <strong>Everything stays clear and usable on counter screens, tablets, and phones.</strong>
                    </article>
                </section>

                <footer className="home-footer" id="resources">
                    <div className="home-footer__content">
                        <p className="home-footer__label">Smart Restaurant System</p>
                        <h2>Launch the guest experience your restaurant deserves.</h2>
                        <p className="home-footer__text">
                            From digital menus to team access, reservation handling, and ordering flows, the whole
                            system is designed to look sharp, stay easy to run, and give your team a cleaner service
                            workflow from the first day.
                        </p>
                    </div>

                    <div className="home-footer__actions">
                        <Link to="/register" className="home-link">
                            <Button>Start Free Setup</Button>
                        </Link>
                        <Link to="/login" className="home-link">
                            <Button variant="secondary">Sign In to Dashboard</Button>
                        </Link>
                    </div>
                </footer>
            </div>
        </main>
    );
}
