function base(props) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  }
}

const ICONS = {
  scissors: (
    <svg {...base({})}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  razor: (
    <svg {...base({})}>
      <path d="M20.5 3.5L9.5 14.5" />
      <path d="M9.5 14.5L11 23" />
      <path d="M20.5 3.5l1.9 1.9" />
      <path d="M9.5 14.5l-3.4 3.4-2.3.9.9-2.3 3.4-3.4" />
    </svg>
  ),
  mustache: (
    <svg {...base({ stroke: 'none' })}>
      <path
        d="M2.5 12.5c1.9-1.5 3.6-1.8 4.5-.6.4.6 1 .4 1.2-2.6.2-1 .6-1.4 1.8-1.4s1.6.4 1.8 1.4c.2 3 .8 3.2 1.2 2.6.9-1.2 2.6-.9 4.5.6-1.1 3.4-3.3 5-7.5 5s-6.4-1.6-7.5-5z"
        fill="currentColor"
      />
    </svg>
  ),
  comb: (
    <svg {...base({})}>
      <rect x="5" y="3" width="14" height="5.5" rx="1.2" fill="currentColor" opacity="0.35" />
      <path d="M7.5 8.5v6.5M12 8.5v8.5M16.5 8.5v6.5M19.5 9.5v9" />
    </svg>
  ),
}

function iconFor(name = '') {
  const n = name.toLowerCase()
  if (/(barba|afeit|navaja|rasur|perfilad)/.test(n)) return 'razor'
  if (/(bigote|mustache|barbita)/.test(n)) return 'mustache'
  if (/(cepillado|lavado|peinado|color|alaciado|keratina|brushing)/.test(n)) return 'comb'
  return 'scissors'
}

export function ServiceIcon({ service, className = '' }) {
  return <span className={`service-icon ${className}`}>{ICONS[iconFor(service)]}</span>
}

export function BarberPole({ className = '' }) {
  return <span className={`barber-pole ${className}`.trim()} aria-hidden="true" />
}
