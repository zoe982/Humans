// Mock for $app/forms — provides the enhance action for form progressive enhancement
export function enhance(form: HTMLFormElement, options?: unknown) {
  return {
    destroy() { /* noop */ },
  };
}
