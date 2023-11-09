import { FC } from 'react';

interface IProps {
  selectedRequestQuantity: number;
}

export const Footer: FC<IProps> = ({ selectedRequestQuantity }) => {
  return (
    <span>
      Total selected:{' '}
      <b>
        {selectedRequestQuantity}{' '}
        {selectedRequestQuantity === 1 ? 'request' : 'requests'}
      </b>
    </span>
  );
};
