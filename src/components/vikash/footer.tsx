"use client";

// Precompute Ashoka Chakra spoke endpoints at module scope with rounding.
// Math.cos/sin produce slightly different floating-point values on the server
// (Node.js) vs client (browser V8), which causes a hydration mismatch.
// Rounding to 2 decimals yields identical, deterministic values on both sides.
const CHAKRA_SPOKES_12 = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  return {
    x2: Math.round((12 + 9 * Math.cos(a)) * 100) / 100,
    y2: Math.round((12 + 9 * Math.sin(a)) * 100) / 100,
  };
});

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="tricolor-bar h-1 w-full opacity-60" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              {CHAKRA_SPOKES_12.map((p, i) => (
                <line key={i} x1="12" y1="12" x2={p.x2} y2={p.y2} />
              ))}
            </svg>
            <span className="font-semibold text-foreground">विकास पथ</span>
            <span>· AI-Powered Hyperlocal Progress Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs">Swachh Bharat Mission · Digital India</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground/80">
          जनता की पुकार, AI का विश्लेषण, और verified प्रशासन · Citizen-driven, AI-powered, government-verified
        </p>
      </div>
    </footer>
  );
}
