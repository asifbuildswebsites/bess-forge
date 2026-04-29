import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { BessProvider } from "@/store/bess-store";
import { ToastProvider } from "@/components/ui/toast";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground data-cell">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Route not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module doesn't exist in the BESS-Calc system.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-pulse-cyan px-4 py-2 text-sm font-bold text-void"
          >
            Return to Sizing
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BESS-Calc India — Battery Storage Sizing & Techno-Economics" },
      {
        name: "description",
        content:
          "Engineering-grade BESS sizing, thermal degradation, dispatch and techno-economic tool for the Indian grid.",
      },
      { property: "og:title", content: "BESS-Calc India — Battery Storage Sizing & Techno-Economics" },
      {
        property: "og:description",
        content: "Battery storage sizing, thermal & techno-economics for Indian grid conditions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "BESS-Calc India — Battery Storage Sizing & Techno-Economics" },
      { name: "description", content: "BESS-Calc India is a web app for sizing, analyzing, and evaluating battery energy storage systems for Indian grids." },
      { property: "og:description", content: "BESS-Calc India is a web app for sizing, analyzing, and evaluating battery energy storage systems for Indian grids." },
      { name: "twitter:description", content: "BESS-Calc India is a web app for sizing, analyzing, and evaluating battery energy storage systems for Indian grids." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0e2b2ddb-8547-4afa-8ae1-fcb4d315707b" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0e2b2ddb-8547-4afa-8ae1-fcb4d315707b" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ToastProvider>
      <BessProvider>
        <Outlet />
      </BessProvider>
    </ToastProvider>
  );
}
