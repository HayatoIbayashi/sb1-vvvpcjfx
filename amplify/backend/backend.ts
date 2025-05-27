import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/myAuth/resource';
import { data } from './data/myData/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
});
