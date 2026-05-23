import { defineWidget } from './defineWidget';
import MyWidget, { myWidgetStyles } from './MyWidget';
import AnotherWidget, { anotherWidgetStyles } from './AnotherWidget';

defineWidget({
	tagName: 'my-widget',
	component: MyWidget,
	observedAttributes: ['title', 'theme'],
	styles: myWidgetStyles,
});

defineWidget({
	tagName: 'another-widget',
	component: AnotherWidget,
	observedAttributes: ['label', 'color'],
	styles: anotherWidgetStyles,
});
