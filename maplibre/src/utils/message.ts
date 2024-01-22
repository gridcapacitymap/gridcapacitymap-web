import { message } from 'antd';

export const getErrorMessageFromError = (e: any): string => {
  if (typeof e === 'string') {
    return e;
  }

  // e.details
  // status 0 - no network
  // id json in res -

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

type IShowMessage = (type: keyof typeof EnumMessageType, text: any) => void;

export const showMessage: IShowMessage = (type, content) => {
  if (type === EnumMessageType.error) {
    content = getErrorMessageFromError(content);
  }
  message[type](content);
};
