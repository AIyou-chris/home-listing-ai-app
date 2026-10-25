// Opens or closes every Collapsible card inside a container.
export function setAllOpen(root: HTMLElement | null, open: boolean) {
  root?.querySelectorAll<HTMLDetailsElement>('details[data-collapsible]').forEach(item => { item.open = open; });
}
