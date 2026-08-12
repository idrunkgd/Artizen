export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center mb-3 shadow-lift">
            <span className="text-3xl font-black text-gold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Artizen</h1>
          <p className="text-sm text-ink-300 mt-1">L'app de l'artisan</p>
        </div>
        {children}
      </div>
    </div>
  );
}
