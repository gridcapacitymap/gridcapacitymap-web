export enum IFormatToShow {
  tree = 'tree',
  json = 'json',
}

export enum CardTabEnum {
  warnings = 'warnings',
  tree = 'tree',
  json = 'json',
  power = 'power',
}

export enum PickedElementTypeEnum {
  bus = 'bus',
  branch = 'branch',
  connection = 'connection',
}

export interface IPickedElement {
  type: keyof typeof PickedElementTypeEnum;
  properties: Record<string, any>;
}
