import { FC, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Col, Divider, Layout, Menu, Row, Space, Tabs } from 'antd';

import { ConnectionsTable } from './components/ConnectionsTable';
import { PickedElementCard } from './components/PickedElementCard';
import { ScenariosTab } from './components/ScenariosTab';
import { CollapseButtons, TwoColLayout } from './components/CollapseButtons';
import { NetworkSelect } from './components/NetworkSelect';

import { MainContextProvider } from './context/MainContext';
import { useAuth } from 'react-oidc-context';
import { AuthModal } from './auth/AuthModal';

import './App.css';
import { isMobile } from './utils/checkups';
import { NetworkSettingModal } from './components/NetworkSettingModal';
import { ItemType, MenuItemType } from 'antd/lib/menu/hooks/useItems';
import { MapComponent } from './components/MapComponent';
import { CurrentScenarioTab } from './components/CurrentScenarioTab';

const { Content, Header } = Layout;

enum GridMapTab {
  connections = 'connections',
  scenarios = 'scenarios',
  currentScenario = 'current_scenario',
}

const tabs = [
  {
    key: GridMapTab.connections,
    label: 'Connections',
    children: <ConnectionsTable />,
  },
  {
    key: GridMapTab.scenarios,
    label: 'Scenarios',
    children: <ScenariosTab />,
  },
  {
    key: GridMapTab.currentScenario,
    label: 'Current Scenario',
    children: <CurrentScenarioTab />,
  },
];

export const App: FC = () => {
  const [searchParams] = useSearchParams();
  const [layoutSize, setLayoutSize] = useState<TwoColLayout>(
    isMobile ? [0, 24] : [12, 12]
  );
  const { tab } = useParams();

  const navigate = useNavigate();

  const auth = useAuth();

  const menuItems: ItemType<MenuItemType>[] = [
    {
      key: 'docs',
      label: (
        <a href="/docs" target="_blank" rel="noopener noreferrer">
          Docs
        </a>
      ),
    },
  ];

  if (auth.isAuthenticated) {
    const logout: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
      e.preventDefault();
      auth.signoutRedirect({
        post_logout_redirect_uri: window.location.origin,
      });
    };

    menuItems.push({
      key: 'currentUser',
      label: `${
        auth?.user?.profile?.name || auth?.user?.profile?.preferred_username
      }`,
      children: [
        {
          label: (
            <a href="#" onClick={logout}>
              Logout
            </a>
          ),
          key: 'logout',
        },
      ],
    });
  }

  return (
    <MainContextProvider>
      <Layout>
        <AuthModal />

        <Header
          style={{
            backgroundColor: '#F7F7F7',
            borderBottom: '1px solid #EEE',
            boxSizing: 'border-box',
            height: 40,
            lineHeight: '40px',
            paddingInline: '8px',
          }}
        >
          <Row justify="space-between" align="middle">
            <Space direction="horizontal">
              <CollapseButtons
                initialSize={layoutSize}
                onLayoutChange={setLayoutSize}
              />
              <Divider type="vertical" />
              <NetworkSelect />
              <NetworkSettingModal />
            </Space>
            <Menu
              style={{ backgroundColor: 'transparent' }}
              mode="horizontal"
              disabledOverflow={true}
              items={menuItems}
            />
          </Row>
        </Header>

        <Content
          style={{
            padding: 0,
            height: 'calc(100dvh - 40px)',
            backgroundColor: 'white',
          }}
        >
          <Row style={{ height: '100%' }}>
            <Col
              span={layoutSize[0]}
              className="overflow-y-auto"
              style={{
                borderRight: '1px solid #EEE',
                boxSizing: 'border-box',
              }}
            >
              <Tabs
                style={{ margin: '8px' }}
                type="card"
                defaultActiveKey={tab}
                items={tabs}
                onChange={(tab) => {
                  navigate(
                    `/grid-map/${tab}${
                      searchParams.get('netId')
                        ? `?netId=${searchParams.get('netId')}`
                        : ''
                    }`,
                    { replace: true }
                  );
                }}
              />
            </Col>
            <Col span={layoutSize[1]} className="overflow-hidden">
              <MapComponent />
              <PickedElementCard />
            </Col>
          </Row>
        </Content>
      </Layout>
    </MainContextProvider>
  );
};
