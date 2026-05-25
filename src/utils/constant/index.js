import { MdOutlineDifference, MdFormatColorFill } from "react-icons/md";
import { TbPasswordFingerprint } from "react-icons/tb";
import { TbClockSearch } from "react-icons/tb";
import { FaEye } from "react-icons/fa";
import { RiImage2Line } from "react-icons/ri";



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
    {
        id: 'image-color-extractor',
        name: 'Image Color Extractor',
        description: 'Extract the colors from an image.',
        url: '/image-color-extractor',
        icon: <RiImage2Line />,
        category: 'color-tools'
    },
    {
        id: 'css-color-names',
        name: 'CSS Color Names',
        description: 'Convert color names to CSS color names.',
        url: '/css-color-names',
        icon: <MdFormatColorFill />,
        category: 'color-tools'
    },

    // text tools
    {
        id: 'text-diff checker',
        name: 'Text Diff Checker',
        description: 'Compare two texts and find the differences between them.',
        url: '/text-diff-checker',
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
    {
        id: 'password-strength-meter',
        name: 'Password Strength Meter',
        description: 'Check the strength of your password.',
        url: '/password-strength-meter',
        icon: <TbPasswordFingerprint />,
        category: 'text-tools'
    },

    // everyday utilities
    {
        id: 'time-difference-calculator',
        name: 'Time Difference Calculator',
        description: 'Calculate the time difference between two times.',
        url: '/time-difference-calculator',
        icon: <TbClockSearch />,
        category: 'everyday-utilities'
    }
   

];

export { CSS_NAMED_COLORS } from './cssNamedColors';