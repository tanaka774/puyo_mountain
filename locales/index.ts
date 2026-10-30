import { en } from './en';
import { ja } from './ja';
import { LSHandle } from '../src/localStorageHandle';

// a language chosen in settings wins over the browser's
const storedLanguage = new LSHandle().getLanguage();
export const languageCode = storedLanguage === 'ja' || storedLanguage === 'en'
  ? storedLanguage
  : navigator.language.startsWith('ja') ? 'ja' : 'en';

const lang = languageCode === 'ja' ? ja : en;

export default lang;
