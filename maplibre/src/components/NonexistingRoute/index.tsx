import { FC } from 'react';
import { Link } from 'react-router-dom';

export const NonexistingRoute: FC = () => {
  return (
    <h1>
      Page is not found.{' '}
      <Link to="/grid-map/connections">Go to default page</Link>
    </h1>
  );
};
