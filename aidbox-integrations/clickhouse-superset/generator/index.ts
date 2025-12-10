import { AidboxClient } from './client';
import { createMultipleAppointments } from './appointment';
import { createMultipleEncounters } from './encounter';
import { parseArgs } from 'util';

const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        auth: { type: 'string', short: 'a' },
        url: { type: 'string', short: 'u' },
    },
});

if (!values.auth) {
    console.error('Error: --auth (-a) parameter is required');
    console.error('Usage: bun run index.ts --auth "Basic <token>" [--url "https://localhost:8888"]');
    process.exit(1);
}

const client = new AidboxClient(values.auth, values.url);


const [appointments, encounters] = await Promise.all([
    createMultipleAppointments(client, 1000),
    createMultipleEncounters(client, 1000),
]);