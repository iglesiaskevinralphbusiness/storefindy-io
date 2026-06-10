import { defineWidget } from './defineWidget';
import MyWidget, { myWidgetStyles } from './MyWidget';
import { locatorStyles } from '../components/Locator';
import LocatorWidget from './LocatorWidget';

defineWidget({
	tagName: 'my-widget',
	component: MyWidget,
	observedAttributes: ['title', 'theme'],
	styles: myWidgetStyles,
});

defineWidget({
	tagName: 'locator',
	component: LocatorWidget,
	observedAttributes: [],
	styles: locatorStyles,
});
