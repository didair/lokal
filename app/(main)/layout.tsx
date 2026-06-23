import { Header } from '@/components/blocks/header';
import { Sidebar } from '@/components/blocks/sidebar';

export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-dvh w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 hidden h-dvh self-start border-r border-zinc-200/80 bg-white/70 backdrop-blur-xl md:block">
        <Sidebar />
      </aside>

      <div className="flex flex-col">
        <Header />

        <main id="main-content" className="flex flex-1 flex-col px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
