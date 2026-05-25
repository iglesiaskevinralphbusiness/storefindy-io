import { defineWidget } from './defineWidget';
import MyWidget, { myWidgetStyles } from './MyWidget';
import AnotherWidget, { anotherWidgetStyles } from './AnotherWidget';
import TextDiffChecker, { textDiffCheckerStyles } from './TextDiffCheckerWidget';

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

defineWidget({
	tagName: 'text-diff-checker',
	component: TextDiffChecker,
	observedAttributes: [],
	styles: textDiffCheckerStyles,
});