import { FC } from 'react';
import { IPickedElement } from '../../../helpers/interfaces';
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
