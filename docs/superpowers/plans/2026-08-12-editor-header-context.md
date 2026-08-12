# Header del Editor: autosave persistente + breadcrumb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el indicador de guardado efímero del editor por uno persistente con tiempo relativo ("Guardado hace 1m"), agregar label al botón de volver, y mostrar un subtítulo de contexto ("Editando: {tab activo}") en el header.

**Architecture:** Una función pura nueva (`formatRelativeTime`) calcula el texto relativo a partir de un timestamp; `EditorPage.jsx` guarda ese timestamp en estado tras cada guardado exitoso y lo re-renderiza cada 20s vía `setInterval`. Sin librerías nuevas, sin cambios al flujo de guardado existente (debounce de 600ms intacto).

**Tech Stack:** React 18 (hooks), CSS plano con el sistema de tokens `--a-*` existente.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev`.
- No se agregan dependencias nuevas (sin librerías de fechas/tiempo relativo).
- Los textos de UI están en español, como el resto del proyecto.
- Reutilizar tokens CSS existentes (`--a-muted`, `--font-mono`) — no inventar valores nuevos.
- No tocar el contenido de los tabs (`SectionsTab`, `ContentTab`, `DesignTab`, `PreviewTab`) ni la lógica de guardado en sí, solo cómo se comunica su estado.

---

## Task 1: `formatRelativeTime` — utilidad de tiempo relativo

**Files:**
- Create: `src/utils/formatRelativeTime.js`

**Interfaces:**
- Produces: `formatRelativeTime(date: Date | null): string` — función pura, named export. Usada por `EditorPage.jsx` (Task 2).

- [ ] **Step 1: Crear la función**

```js
export function formatRelativeTime(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'justo ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
```

Guardar en `src/utils/formatRelativeTime.js`.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores (el archivo aún no se importa desde ningún lado — se conecta en Task 2).

- [ ] **Step 3: Verificación manual de la lógica**

No hay test runner en el proyecto. Verificar manualmente evaluando la función en la consola del navegador tras el build (o razonando sobre el código): `formatRelativeTime(null)` → `''`; `formatRelativeTime(new Date())` → `'justo ahora'`; `formatRelativeTime(new Date(Date.now() - 5 * 60000))` → `'hace 5m'`; `formatRelativeTime(new Date(Date.now() - 3 * 3600000))` → `'hace 3h'`; `formatRelativeTime(new Date(Date.now() - 2 * 86400000))` → `'hace 2d'`. Confirmar estos 5 casos mentalmente contra el código antes de continuar.

- [ ] **Step 4: Commit**

```bash
git add src/utils/formatRelativeTime.js
git commit -m "feat: add formatRelativeTime utility"
```

---

## Task 2: Integrar autosave persistente, breadcrumb y subtítulo en `EditorPage`

**Files:**
- Modify: `src/pages/EditorPage.jsx`
- Modify: `src/styles/global.css:31-43` (bloque de `.adm-brand`/`.adm-tabs`/`.adm-header-actions`/`.adm-save-indicator`)

**Interfaces:**
- Consumes: `formatRelativeTime` (Task 1).

- [ ] **Step 1: Agregar el mapa de labels de tabs y el import**

Al inicio de `src/pages/EditorPage.jsx`, agregar el import de la utilidad junto a los demás imports:

```jsx
import { formatRelativeTime } from '../utils/formatRelativeTime.js';
```

Después de los imports y antes de `export default function EditorPage()`, agregar la constante a nivel de módulo (para no recrearla en cada render):

```jsx
const TAB_LABELS = { sections: 'Secciones', content: 'Contenido', design: 'Diseño', preview: 'Vista previa' };
```

- [ ] **Step 2: Agregar estado de autosave persistente**

Dentro del componente, junto a los demás `useState` (después de `const [saveState, setSaveState] = useState('idle');`), agregar:

```jsx
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [relativeSavedLabel, setRelativeSavedLabel] = useState('');
```

- [ ] **Step 3: Setear `lastSavedAt` cuando el guardado tiene éxito**

En el `useEffect` de autosave existente, dentro del `setTimeout`, la línea:

```jsx
      setSaveState(!error && data && data.length > 0 ? 'saved' : 'idle');
```

pasa a:

```jsx
      const saved = !error && data && data.length > 0;
      setSaveState(saved ? 'saved' : 'idle');
      if (saved) setLastSavedAt(new Date());
```

El resto del efecto (el fire-and-forget en el cleanup por unmount) no cambia.

- [ ] **Step 4: Agregar el efecto que recalcula el texto relativo**

Después del `useEffect` de autosave (después de su cierre `}, [portfolio && portfolio.sections, portfolio && portfolio.theme]);`), agregar un nuevo efecto:

```jsx
  useEffect(() => {
    if (!lastSavedAt) return undefined;
    setRelativeSavedLabel(formatRelativeTime(lastSavedAt));
    const interval = setInterval(() => {
      setRelativeSavedLabel(formatRelativeTime(lastSavedAt));
    }, 20000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);
```

- [ ] **Step 5: Actualizar el JSX del header**

Reemplazar el bloque del `<header className="adm-header">` (breadcrumb, marca, indicador de guardado):

Antes:
```jsx
        <Link to="/dashboard" className="adm-btn-ghost" aria-label="Volver al panel"><ArrowLeft size={14} /></Link>
        <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
```

Después:
```jsx
        <Link to="/dashboard" className="adm-btn-ghost" aria-label="Volver al panel"><ArrowLeft size={14} /> Volver al panel</Link>
        <div className="adm-brand-block">
          <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
          <span className="adm-header-context">Editando: {TAB_LABELS[tab]}</span>
        </div>
```

Y el indicador de guardado:

Antes:
```jsx
          <span className="adm-save-indicator">
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : ''}
          </span>
```

Después:
```jsx
          <span className="adm-save-indicator">
            {saveState === 'saving' ? 'Guardando…' : lastSavedAt ? `Guardado ${relativeSavedLabel}` : ''}
          </span>
```

- [ ] **Step 6: Agregar los estilos nuevos**

En `src/styles/global.css`, dentro del bloque que agrupa `.adm-brand`/`.adm-tabs`/`.adm-header-actions`/`.adm-save-indicator` (líneas 31-43), agregar después de `.adm-brand-mark`:

```css
.adm-brand-block { display: flex; flex-direction: column; gap: 2px; }
.adm-header-context { font-size: 11.5px; color: var(--a-muted); font-family: var(--font-mono); }
```

- [ ] **Step 7: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 8: Verificación manual**

Run: `npm run dev`, abrir un portfolio en `/editor/<id>`.
Expected:
- El botón de volver muestra ícono + texto "Volver al panel".
- Debajo del título del portfolio aparece "Editando: Secciones" (o el tab que esté activo); cambiar de tab actualiza el texto inmediatamente.
- Editar cualquier campo dispara "Guardando…" y, tras el debounce, pasa a "Guardado justo ahora"; esperar y confirmar que more tarde (sin recargar) pasa a "Guardado hace 1m" — se puede verificar más rápido reduciendo temporalmente el intervalo a 3000ms en devtools, o simplemente confirmando que el mecanismo (estado + `setInterval`) está bien cableado por revisión de código si esperar minutos reales no es práctico.
- El header se ve bien en modo claro y oscuro (usa `--a-muted`, ya auditado).
- Confirmar que el Dashboard no cambió (este task no lo toca).

- [ ] **Step 9: Commit**

```bash
git add src/pages/EditorPage.jsx src/styles/global.css
git commit -m "feat: add persistent relative-time autosave indicator and header context to editor"
```

---

## Self-Review Notes

- **Cobertura del spec:** sección 1 (autosave persistente) → Task 2 Steps 2-4 y 8. Sección 2 (breadcrumb con label) → Task 2 Step 5. Sección 3 (subtítulo dinámico) → Task 2 Steps 1 y 5-6. La utilidad de tiempo relativo (parte de la sección 1) → Task 1.
- **Placeholders:** ninguno — todo el código está completo.
- **Consistencia de tipos/nombres:** `formatRelativeTime(date)` se define en Task 1 y se llama igual (mismo nombre, mismo argumento posicional) en Task 2 Step 4. `TAB_LABELS` se define y se usa con las mismas 4 claves (`sections`/`content`/`design`/`preview`) que ya usa el JSX existente de `adm-tabs` para `tab === '...'`.
