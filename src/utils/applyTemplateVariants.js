export function applyTemplateVariants(sections, template) {
  return sections.map((s) => {
    const variant = template.defaultVariants[s.type];
    return variant ? { ...s, variant } : s;
  });
}
