import { render } from 'preact';
import * as Sentry from '@sentry/browser';
import posthog from 'posthog-js';
import { App } from './App';
import './style.css';

const SENTRY_DSN = 'https://35cbd9c4c23a9e941f292b2ec68adf3b@o4511120870932480.ingest.us.sentry.io/4511120907960320';
const POSTHOG_KEY = __POSTHOG_KEY__;
const POSTHOG_HOST = __POSTHOG_HOST__;

if (SENTRY_DSN && !SENTRY_DSN.startsWith('__')) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: location.hostname === 'localhost' ? 'development' : 'production',
  });
}

if (POSTHOG_KEY && !POSTHOG_KEY.startsWith('__')) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage',
    loaded: (ph) => {
      if (location.hostname === 'localhost') ph.opt_out_capturing();
    },
  });
}

export { posthog };

render(<App />, document.getElementById('app'));
