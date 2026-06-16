'use client';
import { useState } from 'react';
import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import {
    TbPalette,
    TbSettings,
    TbCode,
    TbBrandHtml5,
    TbBrandReact,
    TbBrandVue,
    TbBrandAngular,
    TbBrandWordpress,
    TbShoppingBag,
    TbCopy,
    TbDownload,
    TbCheck,
    TbListCheck,
    TbInfoCircle,
} from 'react-icons/tb';
import Button from '@/components/Forms/Button';
import Select from '@/components/Forms/Select';
import { useRouter } from 'next/navigation';

const PLATFORMS = [
    { key: 'html', label: 'HTML', icon: <TbBrandHtml5 /> },
    { key: 'react', label: 'React', icon: <TbBrandReact /> },
    { key: 'vue', label: 'Vue', icon: <TbBrandVue /> },
    { key: 'angular', label: 'Angular', icon: <TbBrandAngular /> },
    { key: 'wordpress', label: 'WordPress', icon: <TbBrandWordpress /> },
    { key: 'shopify', label: 'Shopify', icon: <TbShoppingBag /> },
];

export default function LocatorsEmbedPageClient({ locators, activeLocatorId=null }) {
    const router = useRouter();
    const locatorsOptions = locators.map(locator => ({
        code: locator._id,
        label: locator.name,
    }));
    const locatorSelected = locators.find(locator => locator._id === activeLocatorId);
    const [locatorId, setLocatorId] = useState(locatorSelected?._id || locators[0]._id);
    const [activePlatform, setActivePlatform] = useState('html');
        const [copied, setCopied] = useState(null);

    const copyText = {
        html: `<div id="storefindy-widget"></div>\n<script src="https://storefindy.io/widget.js" data-locator-id="${locatorId}" data-target="storefindy-widget"></script>`,
        react: `import { useEffect } from 'react';\n\nexport default function StoreLocator() {\n  useEffect(() => {\n    const script = document.createElement('script');\n    script.src = 'https://storefindy.io/widget.js';\n    script.dataset.locatorId = '${locatorId}';\n    script.dataset.target = 'storefindy-widget';\n    document.body.appendChild(script);\n  }, []);\n\n  return <div id="storefindy-widget" />;\n}`,
        vue: `<template>\n  <div id="storefindy-widget"></div>\n</template>\n\n<script setup>\nimport { onMounted } from 'vue';\n\nonMounted(() => {\n  const script = document.createElement('script');\n  script.src = 'https://storefindy.io/widget.js';\n  script.dataset.locatorId = '${locatorId}';\n  script.dataset.target = 'storefindy-widget';\n  document.body.appendChild(script);\n});\n</script>`,
        angular: `import { Component, OnInit } from '@angular/core';\n\n@Component({\n  selector: 'app-store-locator',\n  template: '<div id="storefindy-widget"></div>',\n})\nexport class StoreLocatorComponent implements OnInit {\n  ngOnInit(): void {\n    const script = document.createElement('script');\n    script.src = 'https://storefindy.io/widget.js';\n    script.dataset.locatorId = '${locatorId}';\n    script.dataset.target = 'storefindy-widget';\n    document.body.appendChild(script);\n  }\n}`,
        wordpress: `[storefindy id="${locatorId}"]\n\n<div id="storefindy-widget"></div>\n<script src="https://storefindy.io/widget.js" data-locator-id="${locatorId}"></script>`,
        shopify: `<div id="storefindy-widget"></div>\n<script src="https://storefindy.io/widget.js" data-locator-id="${locatorId}" data-target="storefindy-widget"></script>`,
    };

    const fileNames = {
        html: 'index.html',
        react: 'StoreLocator.jsx',
        vue: 'StoreLocator.vue',
        angular: 'store-locator.component.ts',
        wordpress: 'WordPress Shortcode / Block',
        shopify: 'store-locator.liquid',
    };

    const handleCopy = (platform) => {
        navigator.clipboard.writeText(copyText[platform]).catch(() => {});
        setCopied(platform);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(copyText.html);
        a.download = 'storefindy-embed.html';
        a.click();
    };

    const renderCode = () => {
        switch (activePlatform) {
            case 'react':
                return (
                    <pre>
                        <span className={styles.cKey}>import</span>{' '}{'{ useEffect }'}{' '}<span className={styles.cKey}>from</span>{' '}<span className={styles.cStr}>'react'</span>;{'\n\n'}
                        <span className={styles.cKey}>export default function</span>{' '}<span className={styles.cTag}>StoreLocator</span>() {'{'}{'\n'}
                        {'  '}useEffect(() {'=>'} {'{'}{'\n'}
                        {'    '}<span className={styles.cKey}>const</span> script = document.<span className={styles.cTag}>createElement</span>(<span className={styles.cStr}>'script'</span>);{'\n'}
                        {'    '}script.src = <span className={styles.cStr}>'https://storefindy.io/widget.js'</span>;{'\n'}
                        {'    '}script.dataset.locatorId = <span className={styles.cStr}>'{locatorId}'</span>;{'\n'}
                        {'    '}script.dataset.target = <span className={styles.cStr}>'storefindy-widget'</span>;{'\n'}
                        {'    '}document.body.<span className={styles.cTag}>appendChild</span>(script);{'\n'}
                        {'  '}{'}'}, []);{'\n\n'}
                        {'  '}<span className={styles.cKey}>return</span>{' '}<span className={styles.cTag}>&lt;div</span>{' '}<span className={styles.cAttr}>id</span>=<span className={styles.cVal}>"storefindy-widget"</span>{' '}<span className={styles.cTag}>/&gt;</span>;{'\n'}
                        {'}'}
                    </pre>
                );
            case 'vue':
                return (
                    <pre>
                        <span className={styles.cTag}>&lt;template&gt;</span>{'\n'}
                        {'  '}<span className={styles.cTag}>&lt;div</span>{' '}<span className={styles.cAttr}>id</span>=<span className={styles.cVal}>"storefindy-widget"</span><span className={styles.cTag}>&gt;&lt;/div&gt;</span>{'\n'}
                        <span className={styles.cTag}>&lt;/template&gt;</span>{'\n\n'}
                        <span className={styles.cTag}>&lt;script</span>{' '}<span className={styles.cAttr}>setup</span><span className={styles.cTag}>&gt;</span>{'\n'}
                        <span className={styles.cKey}>import</span>{' '}{'{ onMounted }'}{' '}<span className={styles.cKey}>from</span>{' '}<span className={styles.cStr}>'vue'</span>;{'\n\n'}
                        <span className={styles.cTag}>onMounted</span>(() {'=>'} {'{'}{'\n'}
                        {'  '}<span className={styles.cKey}>const</span> script = document.<span className={styles.cTag}>createElement</span>(<span className={styles.cStr}>'script'</span>);{'\n'}
                        {'  '}script.src = <span className={styles.cStr}>'https://storefindy.io/widget.js'</span>;{'\n'}
                        {'  '}script.dataset.locatorId = <span className={styles.cStr}>'{locatorId}'</span>;{'\n'}
                        {'  '}script.dataset.target = <span className={styles.cStr}>'storefindy-widget'</span>;{'\n'}
                        {'  '}document.body.<span className={styles.cTag}>appendChild</span>(script);{'\n'}
                        {'}'});{'\n'}
                        <span className={styles.cTag}>&lt;/script&gt;</span>
                    </pre>
                );
            case 'angular':
                return (
                    <pre>
                        <span className={styles.cKey}>import</span>{' '}{'{ Component, OnInit }'}{' '}<span className={styles.cKey}>from</span>{' '}<span className={styles.cStr}>'@angular/core'</span>;{'\n\n'}
                        <span className={styles.cAttr}>@Component</span>({'{'}{'\n'}
                        {'  '}selector: <span className={styles.cStr}>'app-store-locator'</span>,{'\n'}
                        {'  '}template: <span className={styles.cStr}>'&lt;div id="storefindy-widget"&gt;&lt;/div&gt;'</span>,{'\n'}
                        {'}'}){'\n'}
                        <span className={styles.cKey}>export class</span>{' '}<span className={styles.cTag}>StoreLocatorComponent</span>{' '}<span className={styles.cKey}>implements</span>{' '}<span className={styles.cTag}>OnInit</span>{' '}{'{'}{'\n'}
                        {'  '}<span className={styles.cTag}>ngOnInit</span>(): <span className={styles.cKey}>void</span> {'{'}{'\n'}
                        {'    '}<span className={styles.cKey}>const</span> script = document.<span className={styles.cTag}>createElement</span>(<span className={styles.cStr}>'script'</span>);{'\n'}
                        {'    '}script.src = <span className={styles.cStr}>'https://storefindy.io/widget.js'</span>;{'\n'}
                        {'    '}script.dataset.locatorId = <span className={styles.cStr}>'{locatorId}'</span>;{'\n'}
                        {'    '}script.dataset.target = <span className={styles.cStr}>'storefindy-widget'</span>;{'\n'}
                        {'    '}document.body.<span className={styles.cTag}>appendChild</span>(script);{'\n'}
                        {'  '}{'}'}{'\n'}
                        {'}'}
                    </pre>
                );
            case 'wordpress':
                return (
                    <pre>
                        <span className={styles.cComment}>// Option 1: Use shortcode in page/post</span>{'\n'}
                        [storefindy id=<span className={styles.cStr}>"{locatorId}"</span>]{'\n\n'}
                        <span className={styles.cComment}>// Option 2: Add to theme's footer.php</span>{'\n'}
                        <span className={styles.cTag}>&lt;div</span>{' '}<span className={styles.cAttr}>id</span>=<span className={styles.cVal}>"storefindy-widget"</span><span className={styles.cTag}>&gt;&lt;/div&gt;</span>{'\n'}
                        <span className={styles.cTag}>&lt;script</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>src</span>=<span className={styles.cVal}>"https://storefindy.io/widget.js"</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>data-locator-id</span>=<span className={styles.cVal}>"{locatorId}"</span>{'\n'}
                        <span className={styles.cTag}>&gt;&lt;/script&gt;</span>
                    </pre>
                );
            case 'shopify':
                return (
                    <pre>
                        <span className={styles.cComment}>{'{%- comment -%}'}{'\n'}  Add to your theme section or page template{'\n'}{'{%- endcomment -%}'}</span>{'\n\n'}
                        <span className={styles.cTag}>&lt;div</span>{' '}<span className={styles.cAttr}>id</span>=<span className={styles.cVal}>"storefindy-widget"</span><span className={styles.cTag}>&gt;&lt;/div&gt;</span>{'\n\n'}
                        <span className={styles.cTag}>&lt;script</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>src</span>=<span className={styles.cVal}>"https://storefindy.io/widget.js"</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>data-locator-id</span>=<span className={styles.cVal}>"{locatorId}"</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>data-target</span>=<span className={styles.cVal}>"storefindy-widget"</span>{'\n'}
                        <span className={styles.cTag}>&gt;&lt;/script&gt;</span>
                    </pre>
                );
            default:
                return (
                    <pre>
                        <span className={styles.cComment}>&lt;!-- Place this where you want the locator --&gt;</span>{'\n'}
                        <span className={styles.cTag}>&lt;div</span>{' '}<span className={styles.cAttr}>id</span>=<span className={styles.cVal}>"storefindy-widget"</span><span className={styles.cTag}>&gt;&lt;/div&gt;</span>{'\n\n'}
                        <span className={styles.cComment}>&lt;!-- Add before closing &lt;/body&gt; tag --&gt;</span>{'\n'}
                        <span className={styles.cTag}>&lt;script</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>src</span>=<span className={styles.cVal}>"https://storefindy.io/widget.js"</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>data-locator-id</span>=<span className={styles.cVal}>"{locatorId}"</span>{'\n'}
                        {'  '}<span className={styles.cAttr}>data-target</span>=<span className={styles.cVal}>"storefindy-widget"</span>{'\n'}
                        <span className={styles.cTag}>&gt;&lt;/script&gt;</span>
                    </pre>
                );
        }
    };

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Embed Locator</h1>
                </div>
                <div className={styles.body}>
                    <div className={`${styles.embedContent} ${styles.embedLocator}`}>

                        {/* LOCATOR SELECTOR */}
                        <div className={styles.locatorBar}>
                            <span className={styles.locatorBarLabel}>Locator:</span>
                            <div className={styles.locatorSelectWrap}>
                                <div className={styles.locatorDot}></div>
                                <Select
                                    label=""
                                    name="locator"
                                    value={locatorId}
                                    onChange={e => setLocatorId(e.target.value)}
                                    options={locatorsOptions}
                                />
                            </div>
                            <span className={styles.locatorId}>ID: {locatorId}</span>
                            <div className={styles.locatorBarActions}>
                                <Button
                                    value="Customize"
                                    icon={<TbPalette />}
                                    onClick={() => router.push(`/dashboard/locators/customize/${locatorId}`)}
                                />
                            </div>
                        </div>

                        {/* TWO COL */}
                        <div className={styles.twoCol}>

                            {/* EMBED CODE */}
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbCode /> Embed Code
                                    <span className={`${styles.badge} ${styles.blue}`}>Script Tag</span>
                                </div>

                                <div className={styles.platformTabs}>
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            className={`${styles.platformTab} ${activePlatform === p.key ? styles.active : ''}`}
                                            onClick={() => setActivePlatform(p.key)}
                                        >
                                            {p.icon} {p.label}
                                        </button>
                                    ))}
                                </div>

                                <div className={styles.codeWrap}>
                                    <div className={styles.codeTopbar}>
                                        <div className={styles.codeLang}>
                                            <div className={styles.codeDots}>
                                                <div className={styles.codeDot} style={{ background: '#ff5f57' }}></div>
                                                <div className={styles.codeDot} style={{ background: '#febc2e' }}></div>
                                                <div className={styles.codeDot} style={{ background: '#28c840' }}></div>
                                            </div>
                                            <span>{fileNames[activePlatform]}</span>
                                        </div>
                                        <div className={styles.codeActions}>
                                            <button
                                                type="button"
                                                className={`${styles.codeBtn} ${copied === activePlatform ? styles.copied : ''}`}
                                                onClick={() => handleCopy(activePlatform)}
                                            >
                                                {copied === activePlatform ? <><TbCheck /> Copied!</> : <><TbCopy /> Copy</>}
                                            </button>
                                            {activePlatform === 'html' && (
                                                <button type="button" className={styles.codeBtn} onClick={handleDownload}>
                                                    <TbDownload /> Download
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {renderCode()}
                                </div>

                                {activePlatform === 'html' && (
                                    <div className={styles.cmsNote}>
                                        <TbInfoCircle />
                                        <span>
                                            <strong>Works with any CMS or site builder.</strong> Paste this same snippet into
                                            Webflow, Wix, Squarespace, Drupal, Joomla, or any platform that lets you add custom
                                            HTML — no plugin required.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* HOW TO INSTALL */}
                            <div className={styles.card}>
                                <div className={styles.cardTitle}><TbListCheck /> How to Install</div>
                                <div className={styles.installSteps}>
                                    <div className={styles.installStep}>
                                        <div className={styles.stepNum}>1</div>
                                        <div className={styles.stepContent}>
                                            <div className={styles.stepTitle}>Add the container div</div>
                                            <div className={styles.stepDesc}>
                                                Paste the <code>&lt;div&gt;</code> tag where you want the locator to appear on your page.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.installStep}>
                                        <div className={styles.stepNum}>2</div>
                                        <div className={styles.stepContent}>
                                            <div className={styles.stepTitle}>Add the script tag</div>
                                            <div className={styles.stepDesc}>
                                                Paste the <code>&lt;script&gt;</code> tag just before your closing <code>&lt;/body&gt;</code> tag.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.installStep}>
                                        <div className={styles.stepNum}>3</div>
                                        <div className={styles.stepContent}>
                                            <div className={styles.stepTitle}>Save and publish</div>
                                            <div className={styles.stepDesc}>Save your page. The widget will load automatically when visitors open the page.</div>
                                        </div>
                                    </div>
                                    <div className={styles.installStep}>
                                        <div className={styles.stepNum}>4</div>
                                        <div className={styles.stepContent}>
                                            <div className={styles.stepTitle}>Test it live</div>
                                            <div className={styles.stepDesc}>Open your page in a browser and verify the map and store list appear correctly.</div>
                                            <span className={styles.stepCode}>https://yoursite.com/store-locator</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
