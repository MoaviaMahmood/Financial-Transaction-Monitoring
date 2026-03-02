export const FontLoader = () => (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&family=Orbitron:wght@700;900&display=swap');`}</style>
);

export const GlobalStyles = () => (
    <style>{`
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#root{height:100%;background:#060810;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:2px;}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
    @keyframes bump{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
    @keyframes flashCard{0%,100%{box-shadow:none}50%{box-shadow:0 0 20px rgba(255,59,107,.35)}}
    @keyframes rowFlash{0%,100%{background:transparent}50%{background:rgba(255,59,107,.08)}}
    @keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}
    .row-new{animation:slideIn .4s ease both,rowFlash .8s ease;}
    .kpi-flash{animation:flashCard .5s ease;}
    .badge-bump{animation:bump .3s ease;}
    .ticker-track{display:flex;gap:40px;animation:scroll 28s linear infinite;white-space:nowrap;}
    .toast-in{animation:toastIn .3s ease both;}
    .toast-out{animation:toastOut .3s ease both;}
    @media(max-width:1100px){.main-grid{grid-template-columns:1fr!important;}}
    @media(max-width:900px){
      .kpi-grid{grid-template-columns:repeat(2,1fr)!important;}
      .bottom-grid{grid-template-columns:1fr!important;}
    }
    @media(max-width:480px){
      .kpi-value-num{font-size:20px!important;}
      .page-title-text{font-size:16px!important;}
    }
  `}</style>
);