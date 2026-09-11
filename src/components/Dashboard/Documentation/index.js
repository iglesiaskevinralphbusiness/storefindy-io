// Renders the documentation blocks from src/lib/documentation-content.js into
// the exact markup the documentation page used to hold inline. A server
// component with no state, so the page stays static and its in-page anchor
// links keep working with no JavaScript.
//
// Inline markup is turned into React elements, never into `dangerouslySet-
// InnerHTML`: the copy is ours today, but a renderer that interprets HTML is a
// standing invitation for the day some of it isn't.
import { Fragment } from 'react';
import {
    TbRocket, TbMapPin, TbMapPinPlus, TbPalette, TbUpload, TbCode, TbWorld,
    TbChartBar, TbUser, TbCreditCard, TbLifebuoy, TbHelpCircle, TbBulb,
    TbInfoCircle, TbAlertTriangle, TbCheck, TbSparkles,
} from 'react-icons/tb';
import { INLINE_MARKUP } from '@/lib/documentation-content';

/** Icon keys used in the content data. */
export const DOC_ICONS = {
    rocket: TbRocket,
    pin: TbMapPin,
    'pin-plus': TbMapPinPlus,
    palette: TbPalette,
    upload: TbUpload,
    code: TbCode,
    world: TbWorld,
    chart: TbChartBar,
    user: TbUser,
    card: TbCreditCard,
    lifebuoy: TbLifebuoy,
    help: TbHelpCircle,
    bulb: TbBulb,
    info: TbInfoCircle,
    warning: TbAlertTriangle,
    check: TbCheck,
    sparkles: TbSparkles,
};

/** The icon each note tone carries, matching the original page. */
const NOTE_ICONS = { tip: TbBulb, info: TbInfoCircle, warn: TbAlertTriangle };

export function DocIcon({ name, fallback = TbInfoCircle }) {
    const Icon = DOC_ICONS[name] ?? fallback;
    return <Icon />;
}

/**
 * `**bold**`, `` `code` `` and `_em_` into elements.
 *
 * One pass with a single alternation regex, so the markers can't nest or
 * overlap — which is exactly the restriction that keeps this safe and the copy
 * readable in the data file. The pattern is shared with stripMarkup() so the
 * page and the documentation assistant can never read the same string
 * differently; see INLINE_MARKUP for what went wrong when they didn't.
 */
export function renderRichText(text) {
    const source = String(text ?? '');
    // A fresh instance per call: a shared global-flagged regex carries
    // `lastIndex` between calls, and this loop depends on starting at 0.
    const pattern = new RegExp(INLINE_MARKUP.source, 'g');
    const nodes = [];
    let last = 0;
    let match;
    let key = 0;

    while ((match = pattern.exec(source)) !== null) {
        if (match.index > last) nodes.push(source.slice(last, match.index));
        if (match[1] !== undefined) nodes.push(<strong key={key++}>{match[1]}</strong>);
        else if (match[2] !== undefined) nodes.push(<code key={key++}>{match[2]}</code>);
        else nodes.push(<em key={key++}>{match[3]}</em>);
        last = pattern.lastIndex;
    }
    if (last < source.length) nodes.push(source.slice(last));

    return nodes;
}

/** One content block. `styles` is the documentation page's SCSS module. */
export function DocBlock({ block, styles }) {
    switch (block.type) {
        case 'p':
            return <p>{renderRichText(block.text)}</p>;

        case 'h4':
            return <h4><DocIcon name={block.icon} /> {block.text}</h4>;

        case 'ul':
            return (
                <ul>
                    {block.items.map((item, index) => <li key={index}>{renderRichText(item)}</li>)}
                </ul>
            );

        case 'table':
            return (
                <table className={styles.docTable}>
                    <thead>
                        <tr>{block.head.map((cell, index) => <th key={index}>{renderRichText(cell)}</th>)}</tr>
                    </thead>
                    <tbody>
                        {block.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => <td key={cellIndex}>{renderRichText(cell)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );

        case 'note': {
            const Icon = NOTE_ICONS[block.tone] ?? TbInfoCircle;
            return (
                <div className={`${styles.docNote} ${styles[block.tone]}`}>
                    <Icon />
                    <p>{renderRichText(block.text)}</p>
                </div>
            );
        }

        case 'code':
            return (
                <div className={styles.docCode}>
                    <div className={styles.docCodeTop}>
                        <span className={styles.docCodeLang}>{block.lang}</span>
                        <span className={styles.docCodeDots}><span></span><span></span><span></span></span>
                    </div>
                    <pre>{block.body}</pre>
                </div>
            );

        case 'steps':
            return (
                <div className={styles.docSteps}>
                    {block.items.map((item, index) => (
                        <div className={styles.docStep} key={index}>
                            <div className={styles.docStepNum}>{index + 1}</div>
                            <div className={styles.docStepBody}>
                                <div className={styles.docStepTitle}>{item.title}</div>
                                <div className={styles.docStepDesc}>{renderRichText(item.desc)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            );

        case 'plans':
            return (
                <div className={styles.docPlanRow}>
                    {block.items.map((item, index) => (
                        <span key={index} className={`${styles.docPlanPill} ${styles[item.tone]}`}>
                            <DocIcon name={item.icon} /> {item.text}
                        </span>
                    ))}
                </div>
            );

        case 'faq':
            return (
                <div className={styles.docFaq}>
                    {block.items.map((item, index) => (
                        <div className={styles.docFaqItem} key={index}>
                            <div className={styles.docFaqQ}><TbHelpCircle /> {item.q}</div>
                            <div className={styles.docFaqA}>{renderRichText(item.a)}</div>
                        </div>
                    ))}
                </div>
            );

        default:
            return null;
    }
}

/** One documentation section, heading and all. */
export function DocSection({ section, styles }) {
    return (
        <section id={section.id} className={styles.docSection}>
            <div className={styles.docSectionHead}>
                <div className={styles.docSectionIcon}><DocIcon name={section.icon} /></div>
                <div>
                    <h3>{section.title}</h3>
                    <div className={styles.docSectionSub}>{section.sub}</div>
                </div>
            </div>
            {section.blocks.map((block, index) => (
                <Fragment key={index}>
                    <DocBlock block={block} styles={styles} />
                </Fragment>
            ))}
        </section>
    );
}

export default DocSection;
