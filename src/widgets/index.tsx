import { defineWidget } from './defineWidget';
import MyWidget, { myWidgetStyles } from './MyWidget';
import { poweredByCheckerStyles } from '../components/PoweredBy';
import TextDiffChecker, { textDiffCheckerStyles } from './TextDiffCheckerWidget';

defineWidget({
	tagName: 'my-widget',
	component: MyWidget,
	observedAttributes: ['title', 'theme'],
	styles: myWidgetStyles,
});

defineWidget({
	tagName: 'text-diff-checker',
	component: TextDiffChecker,
	observedAttributes: [],
	styles: textDiffCheckerStyles + poweredByCheckerStyles,
});
