import { AuthProviderProps } from 'react-oidc-context';
import * as Oidc from 'oidc-client-ts';
import { WebStorageStateStore } from 'oidc-client-ts';

Oidc.Log.setLogger(console);
Oidc.Log.setLevel(Oidc.Log.DEBUG);

export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: window.location.href,
  post_logout_redirect_uri: window.location.origin,
  automaticSilentRenew: true,
  scope: 'openid roles',
  monitorSession: false,
  onSigninCallback() {
    // You must provide an implementation of onSigninCallback to oidcConfig to remove the payload
    // from the URL upon successful login.
    // Otherwise if you refresh the page and the payload is still there, signinSilent - which handles renewing your token - won't work.
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),
};
