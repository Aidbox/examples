export { default, setup } from './crud.js'

export const options = {
  discardResponseBodies: false,
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      gracefulStop: '30s',
    },
  },
};

