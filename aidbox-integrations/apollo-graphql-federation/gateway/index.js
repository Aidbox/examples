import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

const RETRY_INTERVAL_MS = 10000;
const authHeader = 'Basic ' + Buffer.from(`root:${process.env.AIDBOX_ROOT_SECRET}`).toString('base64');

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request }) {
    request.http.headers.set('Authorization', authHeader);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startGateway() {
  while (true) {
    try {
      console.log('Connecting to Aidbox...');

      const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [{ name: 'aidbox', url: process.env.AIDBOX_URL }],
        }),
        buildService({ url }) {
          return new AuthenticatedDataSource({ url });
        },
      });

      const server = new ApolloServer({ gateway });

      const { url } = await startStandaloneServer(server, {
        listen: { port: 4000, host: '0.0.0.0' },
      });

      console.log(`Apollo Gateway ready at ${url}`);
      return;
    } catch (error) {
      console.error('Aidbox not responding, activate it first');
      console.error(`Error details: ${error.message}`);
      console.log(`Retrying in ${RETRY_INTERVAL_MS / 1000} seconds...`);
      await sleep(RETRY_INTERVAL_MS);
    }
  }
}

startGateway();
