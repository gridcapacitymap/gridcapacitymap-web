import {
  BusHeadroomSchema_Output,
  ConnectionEnergyKindEnum,
  ConnectionRequestApiSchema,
} from '../client';
import { AnyObject, ConnectionWarnings } from './interfaces';

enum BusTypeEnum {
  'UNKNOWN' = 'UNKNOWN',
  'LOADING' = 'LOADING',
  'GENERATOR' = 'GENERATOR',
  'SWINGBUS' = 'SWINGBUS',
  'DISCONNECTED' = 'DISCONNECTED',
  'LOADING_AREA' = 'LOADING_AREA',
  'NODE' = 'NODE',
}

const BusTypeByBusTypeCodes: Record<number, BusTypeEnum> = {
  0: BusTypeEnum.UNKNOWN,
  1: BusTypeEnum.LOADING,
  2: BusTypeEnum.GENERATOR,
  3: BusTypeEnum.SWINGBUS,
  4: BusTypeEnum.DISCONNECTED,
  5: BusTypeEnum.LOADING_AREA,
};

const supportedEnergyKindsByBysTypes: Record<
  keyof typeof BusTypeEnum,
  ConnectionEnergyKindEnum[]
> = {
  [BusTypeEnum.UNKNOWN]: [],
  [BusTypeEnum.LOADING]: [
    ConnectionEnergyKindEnum.PRODUCTION,
    ConnectionEnergyKindEnum.OTHER,
  ],
  [BusTypeEnum.GENERATOR]: [
    ConnectionEnergyKindEnum.CONSUMPTION,
    ConnectionEnergyKindEnum.OTHER,
  ],
  [BusTypeEnum.SWINGBUS]: [
    ConnectionEnergyKindEnum.PRODUCTION,
    ConnectionEnergyKindEnum.CONSUMPTION,
    ConnectionEnergyKindEnum.OTHER,
    ConnectionEnergyKindEnum.CONSUMPTION_PRODUCTION,
  ],
  [BusTypeEnum.DISCONNECTED]: [],
  [BusTypeEnum.LOADING_AREA]: [
    ConnectionEnergyKindEnum.PRODUCTION,
    ConnectionEnergyKindEnum.OTHER,
  ],
  [BusTypeEnum.NODE]: [
    ConnectionEnergyKindEnum.PRODUCTION,
    ConnectionEnergyKindEnum.CONSUMPTION,
  ],
};

export const checkBusTypeSupportsConReqEnergyKind = (
  busProperties: AnyObject,
  connectionRequest: ConnectionRequestApiSchema,
  throwConsoleWarnings = true
): boolean => {
  if (
    !Object.values(ConnectionEnergyKindEnum).includes(
      connectionRequest.connection_energy_kind
    )
  ) {
    throwConsoleWarnings &&
      console.warn(
        `Connection '${connectionRequest.id}' has unknown connection_energy_kind`
      );
    return false;
  }

  if (
    !busProperties.bus_type ||
    !BusTypeByBusTypeCodes[busProperties.bus_type]
  ) {
    throwConsoleWarnings &&
      console.warn(`Bus ${busProperties.id} has unknown bus_type`);
    return false;
  }

  return supportedEnergyKindsByBysTypes[
    BusTypeByBusTypeCodes[busProperties.bus_type]
  ].includes(connectionRequest.connection_energy_kind);
};

export const checkConnectionRequestForWarnings = (
  connectionRequest: ConnectionRequestApiSchema,
  connectivityBusHeadroom: BusHeadroomSchema_Output | undefined,
  connectivityBusProperties: AnyObject | undefined,
  knownWarnings: Record<string, ConnectionWarnings>,
  throwConsoleWarnings = true
): ConnectionWarnings => {
  const connectionWarnings: ConnectionWarnings = {
    busAvailableLoad: null,
    busAvailableGen: null,
  };

  if (connectivityBusHeadroom) {
    if (connectivityBusHeadroom.gen_avail_mva[0] <= 0) {
      connectionWarnings.busAvailableGen = `'${connectionRequest.project_id}' connectivity bus '${connectivityBusProperties?.number}' doesn't support generation connection`;
    }
    if (connectivityBusHeadroom.load_avail_mva[0] <= 0) {
      connectionWarnings.busAvailableLoad = `'${connectionRequest.project_id}' connectivity bus '${connectivityBusProperties?.number}' doesn't support load connection`;
    }
  }

  if (connectivityBusProperties) {
    checkBusTypeSupportsConReqEnergyKind(
      connectivityBusProperties,
      connectionRequest,
      throwConsoleWarnings
    );
  } else {
    throwConsoleWarnings &&
      console.warn(
        `Connection '${connectionRequest.id}' connectivity bus with number '${connectionRequest.connectivity_node.id} was not found`
      );
  }

  return connectionWarnings;
};

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
