import { defineStorage } from '@aws-amplify/backend-storage';

export const storage = defineStorage({
  name: 'myStorage',
  access: (allow) => ({
    'public/': allow.guest.to(['read']),
    'private/': allow.authenticated.to(['read', 'write', 'delete']),
  }),
});