import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getErrorMessageFromError = (e: any): string => {
  if (typeof e === 'string') {
    return e;
  }

  let message =
    e?.response?.data?.message ||
    e?.response?.message ||
    e?.message ||
    'Unknown error';

  if (message instanceof Array) {
    message = message.map((m) => m).join(', ');
  }

  return message;
};

export enum EnumMessageType {
  info = 'info',
  success = 'success',
  error = 'error',
  warning = 'warning',
  loading = 'loading',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IShowMessage = (type: keyof typeof EnumMessageType, content: any) => void;

export const showMessage: IShowMessage = (type, content) => {
  if (type === EnumMessageType.error) {
    content = getErrorMessageFromError(content);
  }
  message[type](content);
};
