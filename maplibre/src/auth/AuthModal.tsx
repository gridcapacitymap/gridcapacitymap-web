import { useAuth } from 'react-oidc-context';
import { Space } from 'antd';

import * as Oidc from 'oidc-client-ts';
import { oidcConfig } from './config';
import Modal from 'antd/es/modal/Modal';
import React from 'react';

const userManager = new Oidc.UserManager(
  oidcConfig as Oidc.UserManagerSettings
);

const guestLogin = () =>
  userManager.signinRedirect({
    login_hint: 'guest',
    extraQueryParams: { kc_idp_hint: 'default' },
  });

export const AuthModal: React.FC = () => {
  const auth = useAuth();

  let element: JSX.Element = <></>;

  switch (auth.activeNavigator) {
    case 'signinSilent':
      element = <div>Signing you in...</div>;
      break;
    case 'signoutRedirect':
      element = <div>Signing you out...</div>;
  }

  if (auth.isLoading) {
    element = <div>Loading...</div>;
  }

  if (auth.error) {
    element = <div>Oops... {auth.error.message}</div>;
  }

  return (
    <Modal
      width={380}
      mask={true}
      maskClosable={false}
      open={!auth.isAuthenticated}
      cancelText={'Guest'}
      okText={'Signin'}
      onCancel={guestLogin}
      onOk={() => void auth.signinRedirect()}
      closeIcon={false}
      title=""
    >
      <Space size="middle" direction="vertical" style={{ width: 320 }}>
        <a
          href="https://lfenergy.org/projects/grid-capacity-map/"
          target="_blank"
        >
          <img
            width={240}
            style={{ margin: '8px 0' }}
            src="/gridcapacitymap-logo-color.svg"
          />
        </a>

        {element}
      </Space>
    </Modal>
  );
};
