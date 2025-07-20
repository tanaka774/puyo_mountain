import { en } from './en';
import { ja } from './ja';

const lang = navigator.language.startsWith('ja') ? ja : en;

export default lang;
