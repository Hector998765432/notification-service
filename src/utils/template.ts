/**
 * Replace `{key}` placeholders in `template` with the matching values from `vars`.
 */
export function applyTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return match;
    const value = vars[key];
    return value === null || value === undefined ? '' : String(value);
  });
}
