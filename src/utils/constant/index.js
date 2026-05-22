import { MdOutlineDifference } from "react-icons/md";
import { TbPasswordFingerprint } from "react-icons/tb";
import { FaEye } from "react-icons/fa";


export const CATEGORIES = [
    {
        id: 'text-formatters',
        name: 'Code & Text Formatters',
    },
    {
        id: 'text-tools',
        name: 'Text Tools',
    },
    {
        id: 'color-tools',
        name: 'Color Tools',
    },
    {
        id: 'generators',
        name: 'Generators',
    },
    {
        id: 'everyday-utilities',
        name: 'Everyday Utilities',
    },
    {
        id: 'converters',
        name: 'Converters',
    },
    {
        id: 'web-scraping',
        name: 'Web Scraping',
    }
];

export const TOOLS = [
    // color tools
    {
        id: 'contrast-checker',
        name: 'Contrast Checker & Recommender',
        description: 'Check the contrast of your text and background colors to ensure they are accessible.',
        url: '/contrast-checker',
        icon: <FaEye />,
        category: 'color-tools'
    },

    // text tools
    {
        id: 'diff checker',
        name: 'Diff Checker',
        description: 'Compare two texts and find the differences between them.',
        url: '/diff-checker',
        icon: <MdOutlineDifference />,
        category: 'text-tools'
    },

    // generators
    {
        id: 'random-password-generator',
        name: 'Random Password Generator',
        description: 'Generate a random password with customizable options.',
        url: '/random-password-generator',
        icon: <TbPasswordFingerprint />,
        category: 'generators'
    },
   

];