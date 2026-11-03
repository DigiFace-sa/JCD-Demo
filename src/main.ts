import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './styles/index.css';

import { mountAppShell } from './components/AppShell';
import { initI18n } from './i18n/i18n';
import { requireElement } from './utils/dom';

initI18n();
const router = mountAppShell(requireElement(document, '#app', HTMLDivElement));
router.start();
