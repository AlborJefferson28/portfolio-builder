# Nombre del portfolio editable in-place en el header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el nombre del portfolio en el header del editor sea editable con click-to-edit in-place, persistiendo el cambio a través del mismo mecanismo de autosave que ya usan `sections`/`theme`.

**Architecture:** Estado local nuevo (`editingTitle`, `titleDraft`, `titleInputRef`) en `EditorPage.jsx` alterna entre un botón (texto) y un input controlado en el mismo lugar del header. Confirmar (Enter/blur) actualiza `portfolio.title` vía `setPortfolio`, que ya es observado por el `useEffect` de autosave existente — extendido para incluir `title` en su dependencia y en el payload de `supabase.update(...)`. Cancelar (Escape) no toca el estado del portfolio.

**Tech Stack:** React 18 (hooks: `useState`, `useRef`, `useEffect`), CSS plano con tokens `--a-*` existentes.

## Global Constraints

- No hay framework de testing en el proyecto. Verificación: `npm run build` pasando + revisión manual con `npm run dev` (incluye recargar la página para confirmar persistencia real en Supabase).
- No se agregan dependencias nuevas.
- No se agrega un segundo sistema de guardado — el nombre se persiste exclusivamente a través del `useEffect` de autosave ya existente (debounce 600ms, mismo indicador "Guardando…"/"Guardado hace Xm").
- Nunca se guarda un título vacío (tras recortar espacios) — si el usuario lo deja vacío y confirma, se descarta el cambio y se mantiene el título anterior.
- No se toca ningún otro componente (`SectionsContentTab`, `DesignTab`, `PreviewTab`, `PublishModal`, `ThemeToggle`).
- `.adm-brand-mark` (el símbolo `$`) sigue siempre visible, fuera del área editable.

---

## Task 1: Estado, handlers y JSX del nombre editable

**Files:**
- Modify: `src/pages/EditorPage.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: ningún componente ni prop nuevos expuestos fuera de `EditorPage.jsx` — todo el estado es local a ese componente.

- [ ] **Step 1: Agregar el import de `useRef` (ya está) y declarar el estado nuevo**

`useRef` ya está importado en la línea 1 (`import { useEffect, useState, useCallback, useRef } from 'react';`) — no hace falta tocar el import.

Después de la línea `const [relativeSavedLabel, setRelativeSavedLabel] = useState('');` (dentro de las declaraciones de estado de `EditorPage`), agregar:

```jsx
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef(null);
```

- [ ] **Step 2: Agregar los handlers de edición**

Después de la declaración de `setTheme` (`const setTheme = useCallback((theme) => setPortfolio((p) => ({ ...p, theme })), []);`), agregar:

```jsx
  const startEditingTitle = () => {
    setTitleDraft(portfolio.title);
    setEditingTitle(true);
  };
  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== portfolio.title) {
      setPortfolio((p) => ({ ...p, title: trimmed }));
    }
    setEditingTitle(false);
  };
  const cancelTitle = () => setEditingTitle(false);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);
```

- [ ] **Step 3: Extender el autosave para incluir `title`**

Reemplazar la dependencia del `useEffect` de autosave:

```jsx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme]);
```

por:

```jsx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme, portfolio && portfolio.title]);
```

Y reemplazar las **dos** llamadas a `.update({ sections: portfolio.sections, theme: portfolio.theme, updated_at: new Date().toISOString() })` (una dentro del `setTimeout` del debounce, otra dentro del `if (isUnmountingRef.current)` del cleanup) por:

```jsx
        .update({ sections: portfolio.sections, theme: portfolio.theme, title: portfolio.title, updated_at: new Date().toISOString() })
```

(Mismo cambio en ambas ocurrencias — usar `grep -n "sections: portfolio.sections, theme: portfolio.theme" src/pages/EditorPage.jsx` para ubicar ambas antes de editar.)

- [ ] **Step 4: Reemplazar el JSX estático del nombre por el modo editable**

Reemplazar:

```jsx
        <div className="adm-brand-block">
          <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
        </div>
```

por:

```jsx
        <div className="adm-brand-block">
          <div className="adm-brand">
            <span className="adm-brand-mark">$</span>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                className="adm-brand-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelTitle(); }
                }}
              />
            ) : (
              <button type="button" className="adm-brand-btn" onClick={startEditingTitle}>{portfolio.title}</button>
            )}
          </div>
        </div>
```

- [ ] **Step 5: Agregar los estilos `.adm-brand-btn`/`.adm-brand-input`**

Localizar con `grep -n "^\.adm-brand-mark" src/styles/global.css`. Agregar inmediatamente después de esa línea:

```css
.adm-brand-btn {
  background: none; border: none; padding: 0; margin: 0; cursor: pointer;
  font: inherit; color: inherit; text-align: left;
}
.adm-brand-btn:hover { text-decoration: underline; text-decoration-color: var(--a-border); }
.adm-brand-input {
  font-family: var(--font-mono); font-size: 13px; color: var(--a-text); background: var(--a-bg);
  border: 1px solid var(--a-accent); border-radius: 5px; padding: 2px 6px; outline: none; min-width: 120px;
}
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 7: Verificación manual**

Run: `npm run dev`, abrir `/editor/<id>`.
Expected:
- Click sobre el nombre del portfolio en el header: se convierte en un input con el texto actual, ya seleccionado, con foco.
- Escribir un nombre nuevo, presionar Enter: el header muestra el nuevo nombre; el indicador pasa a "Guardando…" y después "Guardado hace unos segundos".
- Recargar la página (`F5` o navegar afuera y volver a entrar al editor): el nombre nuevo persiste — confirma que se guardó en Supabase.
- Editar, borrar todo el texto (dejar vacío), presionar Enter: el nombre vuelve al valor anterior, sin disparar "Guardando…" (no hubo cambio real que guardar).
- Editar, escribir algo, presionar Escape: el nombre vuelve al valor anterior sin disparar guardado.
- Editar, escribir algo, hacer click en cualquier otro lugar de la página (blur): se comporta igual que Enter, confirma el cambio.

- [ ] **Step 8: Commit**

```bash
git add src/pages/EditorPage.jsx src/styles/global.css
git commit -m "feat: make portfolio title editable in-place in the editor header"
```

---

## Self-Review Notes

- **Cobertura del spec:** Sección "Estado nuevo" → Task 1 Step 1. "Handlers" → Step 2. "Autosave" → Step 3. "JSX" → Step 4. "CSS" → Step 5. Verificación → Step 7.
- **Placeholders:** ninguno — todo el código de cada step está completo.
- **Consistencia:** `editingTitle`/`titleDraft`/`titleInputRef`/`startEditingTitle`/`commitTitle`/`cancelTitle` se declaran en Steps 1-2 y se usan con los mismos nombres en el JSX de Step 4 — sin discrepancias. El payload de `supabase.update(...)` en Step 3 incluye `title: portfolio.title`, consistente con que `portfolio.title` es el campo que Step 4 actualiza vía `setPortfolio`.
