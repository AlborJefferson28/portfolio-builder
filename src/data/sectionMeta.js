export const SECTION_META = {
  hero: {
    label: 'Hero',
    variants: {
      centered: { label: 'Centrado', description: 'Todo alineado al centro, enfoque directo.' },
      split: { label: 'Editorial dividido', description: 'Texto a un lado, foto grande al otro.' },
    },
  },
  about: {
    label: 'Sobre mí',
    variants: {
      default: { label: 'Simple', description: 'Un bloque de texto legible.' },
    },
  },
  projects: {
    label: 'Proyectos',
    variants: {
      grid: { label: 'Grid', description: 'Tarjetas en cuadrícula, tipo galería.' },
      list: { label: 'Lista numerada', description: 'Fila por fila, con índice.' },
    },
  },
  skills: {
    label: 'Habilidades',
    variants: {
      tags: { label: 'Tags', description: 'Etiquetas agrupadas, sin niveles.' },
      bar: { label: 'Gráfico de barras', description: 'Nivel de cada habilidad en barras.' },
      radar: { label: 'Gráfico radar', description: 'Vista comparativa tipo radar.' },
    },
  },
  experience: {
    label: 'Experiencia',
    variants: {
      timeline: { label: 'Línea de tiempo', description: 'Vertical, con marcador por período.' },
      compact: { label: 'Lista compacta', description: 'Más densa, sin elementos gráficos.' },
    },
  },
  contact: {
    label: 'Contacto',
    variants: {
      default: { label: 'Simple', description: 'Email destacado + redes.' },
    },
  },
};
