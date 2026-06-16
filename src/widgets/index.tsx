import { defineWidget } from './defineWidget';
import { locatorStyles } from '../components/Locator';
import LocatorWidget from './LocatorWidget';

defineWidget<{ locator?: string }>({
	tagName: 'locator-widget',
	component: LocatorWidget,
	observedAttributes: ['locator'],
	styles: locatorStyles,
});
