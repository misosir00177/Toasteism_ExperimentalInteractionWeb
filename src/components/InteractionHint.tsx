export function InteractionHint() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-[#E5E7EB] font-mono text-xs tracking-widest leading-loose opacity-90 pointer-events-none select-none">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-4 rounded shadow-lg">
        <div className="mb-2 text-white/50">[ TEXTUAL MATTER / 001 ]</div>
        <div>Drag to deform.</div>
        <div>Ctrl + Drag to inspect.</div>
      </div>
    </div>
  );
}
