// The picture shown when a link to UniDesk is shared (WhatsApp, X, Facebook, Google Discover). Drawn on the server, no files needed.
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, headline, sub, footer }: { eyebrow: string; headline: string; sub?: string; footer?: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: 'linear-gradient(135deg, #0B1F4D 0%, #1B3A8A 100%)', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', width: 56, height: 56, borderRadius: 14, background: '#F2A900', color: '#0B1F4D', fontSize: 34, fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>U</div>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800 }}>UniDesk</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#F2A900', textTransform: 'uppercase', letterSpacing: 2 }}>{eyebrow}</div>
        <div style={{ display: 'flex', fontSize: headline.length > 60 ? 54 : 68, fontWeight: 800, lineHeight: 1.1 }}>{headline}</div>
        {sub ? <div style={{ display: 'flex', fontSize: 32, color: '#DCE4F7', lineHeight: 1.3 }}>{sub}</div> : null}
      </div>
      <div style={{ display: 'flex', fontSize: 26, color: '#9FB4E8' }}>{footer ?? 'unidesk.co.ke · Made for Kenyatta University students'}</div>
    </div>
  );
}
