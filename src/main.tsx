import ReactDOM from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/manrope';
import App from './App';
import { LocaleProvider } from './lib/i18n';
import './styles.css';
import './home-refresh.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<LocaleProvider><App /></LocaleProvider>);
