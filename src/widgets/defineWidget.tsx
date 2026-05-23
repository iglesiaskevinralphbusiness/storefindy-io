import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ComponentType } from 'react';

type WidgetOptions<P> = {
	tagName: string;
	component: ComponentType<P>;
	observedAttributes: ReadonlyArray<keyof P & string>;
	styles?: string;
};

export function defineWidget<P extends Record<string, string | undefined>>(
	opts: WidgetOptions<P>
) {
	if (typeof window === 'undefined') return;
	if (customElements.get(opts.tagName)) return;

	class WidgetElement extends HTMLElement {
		static get observedAttributes() {
			return [...opts.observedAttributes];
		}

		private root: Root | null = null;
		private mountPoint: HTMLDivElement | null = null;

		connectedCallback() {
			const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

			if (opts.styles) {
				const styleEl = document.createElement('style');
				styleEl.textContent = opts.styles;
				shadow.appendChild(styleEl);
			}

			this.mountPoint = document.createElement('div');
			shadow.appendChild(this.mountPoint);

			this.root = createRoot(this.mountPoint);
			this.render();
		}

		attributeChangedCallback() {
			if (this.root) this.render();
		}

		disconnectedCallback() {
			this.root?.unmount();
			this.root = null;
			this.mountPoint = null;
		}

		private render() {
			if (!this.root) return;
			const props = {} as P;
			for (const name of opts.observedAttributes) {
				(props as Record<string, string | undefined>)[name] =
					this.getAttribute(name) ?? undefined;
			}
			this.root.render(createElement(opts.component, props));
		}
	}

	customElements.define(opts.tagName, WidgetElement);
}
