import { uid } from '../utils/uid.js';

export function getInitialData() {
  return {
    theme: 'light',
    sections: [
      {
        id: 'hero', type: 'hero', enabled: true, variant: 'centered',
        content: {
          name: '',
          role: '',
          tagline: '',
          photoUrl: '',
        },
      },
      {
        id: 'about', type: 'about', enabled: true, variant: 'default',
        content: {
          body: '',
        },
      },
      {
        id: 'projects', type: 'projects', enabled: true, variant: 'grid',
        content: { items: [] },
      },
      {
        id: 'skills', type: 'skills', enabled: true, variant: 'bar',
        content: { items: [] },
      },
      {
        id: 'experience', type: 'experience', enabled: true, variant: 'timeline',
        content: { items: [] },
      },
      {
        id: 'contact', type: 'contact', enabled: true, variant: 'default',
        content: {
          email: '',
          links: [
            { id: uid(), label: 'GitHub', url: '' },
            { id: uid(), label: 'LinkedIn', url: '' },
          ],
        },
      },
    ],
  };
}
