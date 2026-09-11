import AIDocsAssistant from '@/components/ai/AIDocsAssistant';

/**
 * Wraps every /dashboard page so the "Ask AI" helper is available throughout,
 * not only on the documentation page.
 *
 * A layout rather than a mount on each page: there are twenty-odd dashboard
 * routes and more will be added, and this way a new one gets the helper without
 * anyone remembering to add it. It is scoped to `dashboard/` rather than to the
 * parent route group so the admin pages, which share that group but are not a
 * merchant-facing surface, stay as they were.
 *
 * The layout itself renders no markup of its own — it adds one fixed-position
 * client component beside the page — so it can't disturb any existing dashboard
 * layout, and the pages under it stay server components.
 */
export default function DashboardLayout({ children }) {
    return (
        <>
            {children}
            <AIDocsAssistant />
        </>
    );
}
