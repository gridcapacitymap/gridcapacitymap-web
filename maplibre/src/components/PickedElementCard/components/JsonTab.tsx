import { FC } from 'react';
import { IPickedElement } from '../../../types/pickedCard';
import { BusHeadroomSchema_Output } from '../../../client';

type Props = {
  pickedElement: IPickedElement;
  pickedElementHeadroom: BusHeadroomSchema_Output | null;
};

export const JsonTab: FC<Props> = ({
  pickedElement,
  pickedElementHeadroom,
}) => {
  return (
    <pre>
      {JSON.stringify(
        pickedElementHeadroom
          ? {
              ...pickedElement.properties,
              headroom: pickedElementHeadroom,
            }
          : pickedElement.properties,
        null,
        2
      )}
    </pre>
  );
};
