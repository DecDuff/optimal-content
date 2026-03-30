import { AppSidebar } from "@/components/app-sidebar";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-slate-200 md:flex-row">
      <AppSidebar />
      <main className="relative min-h-screen flex-1 overflow-x-auto bg-[#030712]">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          aria-hidden
          style={{
            background:
              "radial-gradient(400px 400px at 90% 8%, rgba(99,102,241,0.12), transparent 70%), radial-gradient(380px 380px at 5% 85%, rgba(16,185,129,0.06), transparent 65%), radial-gradient(ellipse 70% 45% at 50% -5%, rgba(99,102,241,0.08), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-[min(420px,50vh)] w-[min(420px,70vw)] -translate-y-1/4 translate-x-1/4 rounded-full bg-violet-600/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[min(380px,45vh)] w-[min(380px,65vw)] -translate-x-1/3 translate-y-1/4 rounded-full bg-emerald-600/10 blur-3xl"
          aria-hidden
        />
        <div className="relative z-[1]">{children}</div>
      </main>
    </div>
  );
}
