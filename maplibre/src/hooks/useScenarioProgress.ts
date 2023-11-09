import { useEffect, useState } from 'react';
import { ScenarioBaseApiSchema } from '../client';
import {
  ScenarioCalculationStatusEnum,
  ScenarioSubscribingProgressData,
} from '../helpers/interfaces';
import { EnumMessageType, showMessage } from '../helpers/message';

export const useScenarioProgress = (
  scenariosList: ScenarioBaseApiSchema[]
): ScenarioSubscribingProgressData[] => {
  const [scenariosWS, setScenariosWS] = useState<WebSocket | null>(null);
  const [scenariosProgressList, setScenariosProgressList] = useState<
    ScenarioSubscribingProgressData[]
  >([]);

  const createWSConnection = () => {
    if (!scenariosWS) {
      const protocol = window.location.protocol.includes('https')
        ? 'wss'
        : 'ws';
      setScenariosWS(
        new WebSocket(`${protocol}://${window.location.host}/api/ws/events`)
      );
    }
  };

  useEffect(() => {
    createWSConnection();
  }, []);

  useEffect(() => {
    if (scenariosWS) {
      scenariosWS.onopen = () => {
        console.log('websocket connected');
      };

      scenariosWS.onclose = () => {
        setScenariosWS(null);
        console.log('websocket closed');
      };

      scenariosWS.onmessage = (m) => {
        const data = JSON.parse(m.data) as ScenarioSubscribingProgressData;
        const name =
          scenariosList.find((s) => s.id === data.scenario_id)?.name ||
          data.scenario_id;

        if (data.state === ScenarioCalculationStatusEnum.SUCCESS) {
          showMessage(
            EnumMessageType.success,
            `Scenario ${name} successfully calculated`
          );
        }
        if (data.state === ScenarioCalculationStatusEnum.FAILURE) {
          showMessage(
            EnumMessageType.error,
            `Scenario ${name} calculation failed: ${
              data.state_reason || 'UNKNOWN'
            }`
          );
        }

        setScenariosProgressList((prev) => {
          if (prev.some((sp) => sp.scenario_id == data.scenario_id)) {
            return prev.map((sp) =>
              sp.scenario_id === data.scenario_id ? data : sp
            );
          } else {
            return [...prev, data];
          }
        });
      };

      scenariosWS.onerror = (e) => {
        console.log('websocket error', e);
        scenariosWS?.close();
        setScenariosWS(null);
        setTimeout(() => scenariosWS || createWSConnection(), 500);
      };
    }
  }, [scenariosWS]);

  useEffect(() => {
    setScenariosProgressList([]);
    if (scenariosWS && scenariosWS.readyState === scenariosWS.OPEN) {
      scenariosWS.send(
        JSON.stringify({
          event: 'subscribe',
          channel: 'scenarios',
          ids: scenariosList.map((s) => s.id),
        })
      );
    }
  }, [scenariosList, scenariosWS?.readyState]);

  return scenariosProgressList;
};
