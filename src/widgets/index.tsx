import { defineWidget } from './defineWidget';
import MyWidget, { myWidgetStyles } from './MyWidget';
import AnotherWidget, { anotherWidgetStyles } from './AnotherWidget';
import { poweredByCheckerStyles } from '../components/PoweredBy';
import TextDiffChecker, { textDiffCheckerStyles } from './TextDiffCheckerWidget';
import RandomPasswordGenerator, { randomPasswordGeneratorStyles } from './RandomPasswordGeneratorWidget';
import PasswordStrengthMeter, { passwordStrengthMeterStyles } from './PasswordStrengthMeterWidget';
import ContrastChecker, { contrastCheckerStyles } from './ContrastCheckerWidget';
import CSSColorNames, { cssColorNamesStyles } from './CSSColorNamesWidget';

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
	styles: textDiffCheckerStyles + poweredByCheckerStyles,
});

defineWidget({
	tagName: 'random-password-generator',
	component: RandomPasswordGenerator,
	observedAttributes: [],
	styles: randomPasswordGeneratorStyles + poweredByCheckerStyles,
});

defineWidget({
	tagName: 'password-strength-meter',
	component: PasswordStrengthMeter,
	observedAttributes: [],
	styles: passwordStrengthMeterStyles + poweredByCheckerStyles,
});

defineWidget({
	tagName: 'contrast-checker',
	component: ContrastChecker,
	observedAttributes: [],
	styles: contrastCheckerStyles + poweredByCheckerStyles,
});

defineWidget({
	tagName: 'css-color-names',
	component: CSSColorNames,
	observedAttributes: [],
	styles: cssColorNamesStyles + poweredByCheckerStyles,
});