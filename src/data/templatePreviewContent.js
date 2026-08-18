import { uid } from '../utils/uid.js';

export const PREVIEW_SECTIONS = [
  {
    id: 'hero', type: 'hero', enabled: true, variant: 'centered',
    content: {
      name: 'Ana Torres',
      role: 'Product Designer',
      tagline: 'Diseño productos digitales que la gente realmente quiere usar, con foco en sistemas y en el detalle.',
      photoUrl: '',
    },
  },
  {
    id: 'about', type: 'about', enabled: true, variant: 'default',
    content: {
      body: 'Diseñadora de producto con seis años de experiencia liderando sistemas de diseño y experiencias digitales end-to-end.\nTrabajé con equipos de ingeniería y negocio para llevar ideas desde investigación hasta producción, siempre con foco en claridad, consistencia y detalle.',
    },
  },
  {
    id: 'projects', type: 'projects', enabled: true, variant: 'grid',
    content: {
      items: [
        {
          id: uid(), title: 'Studio App', url: '#', stack: 'Figma, Design Tokens, React',
          description: 'Sistema de diseño unificado para una suite de herramientas de productividad, adoptado por 4 equipos de producto.',
        },
        {
          id: uid(), title: 'Kioma Brand', url: '#', stack: 'Identidad, Web, Design System',
          description: 'Identidad visual y sitio para una fintech en etapa temprana, de cero a lanzamiento en ocho semanas.',
        },
        {
          id: uid(), title: 'Northbeam', url: '#', stack: 'UX Research, Prototipado',
          description: 'Rediseño del flujo de onboarding, con una mejora del 32% en activación medida por A/B testing.',
        },
      ],
    },
  },
  {
    id: 'skills', type: 'skills', enabled: true, variant: 'bar',
    content: {
      items: [
        { id: uid(), name: 'Product Design', level: 95 },
        { id: uid(), name: 'Design Systems', level: 90 },
        { id: uid(), name: 'Figma', level: 95 },
        { id: uid(), name: 'Prototipado', level: 85 },
        { id: uid(), name: 'UX Research', level: 75 },
        { id: uid(), name: 'HTML/CSS', level: 65 },
      ],
    },
  },
  {
    id: 'experience', type: 'experience', enabled: true, variant: 'timeline',
    content: {
      items: [
        {
          id: uid(), org: 'Kioma', role: 'Senior Product Designer', period: '2023 — Presente',
          description: 'Lidero el sistema de diseño y el equipo de diseño de producto para la plataforma principal.',
        },
        {
          id: uid(), org: 'Northbeam', role: 'Product Designer', period: '2020 — 2023',
          description: 'Diseño end-to-end de features nuevas, de investigación a implementación junto a ingeniería.',
        },
        {
          id: uid(), org: 'Estudio Lira', role: 'Diseñadora Junior', period: '2018 — 2020',
          description: 'Identidad de marca y diseño web para clientes de distintas industrias.',
        },
      ],
    },
  },
  {
    id: 'contact', type: 'contact', enabled: true, variant: 'default',
    content: {
      email: 'ana@example.com',
      links: [
        { id: uid(), label: 'GitHub', url: '#' },
        { id: uid(), label: 'LinkedIn', url: '#' },
      ],
    },
  },
];
