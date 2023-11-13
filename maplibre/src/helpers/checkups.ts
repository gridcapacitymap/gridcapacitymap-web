import {
  ConnectionEnergyKindEnum,
  ConnectionRequestApiSchema,
} from '../client';
import { showMessage } from './message';

enum BusTypeEnum {
  'UNKNOWN' = 'UNKNOWN',
  'LOADING' = 'LOADING',
  'GENERATOR' = 'GENERATOR',
  'SWINGBUG' = 'SWINGBUG',
  'DISCONNECTED' = 'DISCONNECTED',
  'LOADING_AREA' = 'LOADING_AREA',
}

const BusTypeByBusTypeCodes: Record<number, BusTypeEnum> = {
  0: BusTypeEnum.UNKNOWN,
  1: BusTypeEnum.LOADING,
  2: BusTypeEnum.GENERATOR,
  3: BusTypeEnum.SWINGBUG,
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
  [BusTypeEnum.SWINGBUG]: [
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
};

export const checkBusTypeSupportsConReqEnergyKind = (
  busProperties: Record<string, any>,
  connectionRequest: ConnectionRequestApiSchema
): boolean => {
  if (
    typeof busProperties.bus_type === 'number' &&
    Object.prototype.hasOwnProperty.call(
      BusTypeByBusTypeCodes,
      busProperties.bus_type
    )
  ) {
    if (
      supportedEnergyKindsByBysTypes[
        BusTypeByBusTypeCodes[busProperties.bus_type]
      ].includes(connectionRequest.connection_energy_kind)
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    showMessage('error', `Bus ${busProperties.number} has unknown bus type`);
    return false;
  }
};

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
