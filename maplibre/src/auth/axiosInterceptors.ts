import { UserManager, UserManagerSettings } from 'oidc-client-ts';
import axios from 'axios';
import { oidcConfig } from './config.js';
import { User } from 'oidc-client-ts';

function getUser() {
  const oidcStorage = localStorage.getItem(
    `oidc.user:${oidcConfig.authority}:${oidcConfig.client_id}`
  );
  if (!oidcStorage) {
    return null;
  }

  return User.fromStorageString(oidcStorage);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForToken() {
  let token = getUser()?.access_token;

  while (!token) {
    // while loop, condition is checked at the end of each iteration
    await sleep(1000);
    token = getUser()?.access_token;
  }

  return token;
}

axios.interceptors.request.use(
  async function (config) {
    const token = await waitForToken();

    Object.assign(config.headers, {
      Authorization: `Bearer ${token}`,
    });
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  async function (response) {
    return response;
  },
  async function (error) {
    if (error?.response?.status === 401) {
      const user = getUser();

      if (user) {
        const userManager = new UserManager(oidcConfig as UserManagerSettings);

        userManager.signoutRedirect({
          post_logout_redirect_uri: window.location.origin,
        });
      }
    }
    return Promise.reject(error);
  }
);
