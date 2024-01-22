import { Dispatch, Key, SetStateAction } from 'react';
import { ColumnType } from 'antd/es/table';

export type SetState<T> = Dispatch<SetStateAction<T>>;

export type ISetStateOnChange = (arg: string | number) => void;

// eslint-disable-next-line
export type AnyObject = Record<string, any>;

// eslint-disable-next-line
export type ColumnWithKeyType<T = any> = ColumnType<T> & { key: Key };

export type ConnectionWarnings = {
  busAvailableLoad: string | null;
  busAvailableGen: string | null;
};
