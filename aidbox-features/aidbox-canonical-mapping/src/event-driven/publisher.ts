/**
 * Event Publisher (for testing)
 * Publishes simulated ADT fat events to RabbitMQ
 */

import * as amqp from "amqplib";
import type { ADTEvent, ADTPatientData, ADTEncounterData, EventEnvelope } from "../shared/types/events";
import { TEST_WARD_ID, TEST_WARD_NAME, TEST_SITE_NAME, TEST_PATIENTS } from "../shared/test-data";

const EXCHANGE_NAME = "his-events";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection["createChannel"]>>;

class EventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private rabbitmqUrl: string;

  constructor(rabbitmqUrl: string) {
    this.rabbitmqUrl = rabbitmqUrl;
  }

  async connect(): Promise<void> {
    console.log(`[Publisher] Connecting to RabbitMQ: ${this.rabbitmqUrl}`);

    this.connection = await amqp.connect(this.rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    console.log(`[Publisher] Connected`);
  }

  async publish(event: ADTEvent): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call connect() first.");
    }

    const envelope: EventEnvelope = {
      id: crypto.randomUUID(),
      source: "his-simulator",
      timestamp: new Date().toISOString(),
      payload: event,
    };

    const routingKey = `adt.${event.action}`;
    const message = JSON.stringify(envelope);

    this.channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message), {
      persistent: true,
      contentType: "application/json",
    });

    console.log(`[Publisher] Published event ${envelope.id} with routing key '${routingKey}'`);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    console.log("[Publisher] Connection closed");
  }
}

function createAdmitEvent(
  patientData: ADTPatientData,
  encounterData: Omit<ADTEncounterData, "wardId" | "wardName" | "siteName">,
  wardId: string,
  wardName: string,
  siteName: string
): ADTEvent {
  return {
    eventType: "ADT",
    action: "admit",
    timestamp: new Date().toISOString(),
    patient: patientData,
    encounter: {
      ...encounterData,
      wardId,
      wardName,
      siteName,
    },
  };
}

function createDischargeEvent(
  patientData: ADTPatientData,
  encounterData: Omit<ADTEncounterData, "wardId" | "wardName" | "siteName">,
  wardId: string,
  wardName: string,
  siteName: string
): ADTEvent {
  return {
    eventType: "ADT",
    action: "discharge",
    timestamp: new Date().toISOString(),
    patient: patientData,
    encounter: {
      ...encounterData,
      wardId,
      wardName,
      siteName,
      dischargeDate: new Date().toISOString(),
    },
  };
}

function createTransferEvent(
  patientData: ADTPatientData,
  encounterData: Omit<ADTEncounterData, "wardId" | "wardName" | "siteName">,
  newWardId: string,
  newWardName: string,
  siteName: string,
  newBedName: string
): ADTEvent {
  return {
    eventType: "ADT",
    action: "transfer",
    timestamp: new Date().toISOString(),
    patient: patientData,
    encounter: {
      ...encounterData,
      wardId: newWardId,
      wardName: newWardName,
      siteName,
      bedName: newBedName,
    },
  };
}

async function main(): Promise<void> {
  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://localhost";
  const action = process.argv[2] as "admit" | "discharge" | "transfer" | undefined;

  if (!action || !["admit", "discharge", "transfer"].includes(action)) {
    console.log("Usage: bun run src/event-driven/publisher.ts <admit|discharge|transfer>");
    console.log("\nExamples:");
    console.log("  bun run src/event-driven/publisher.ts admit");
    console.log("  bun run src/event-driven/publisher.ts discharge");
    console.log("  bun run src/event-driven/publisher.ts transfer");
    process.exit(1);
  }

  const publisher = new EventPublisher(rabbitmqUrl);
  await publisher.connect();

  for (const { patient, encounter } of TEST_PATIENTS) {
    let event: ADTEvent;

    switch (action) {
      case "admit":
        event = createAdmitEvent(patient, encounter, TEST_WARD_ID, TEST_WARD_NAME, TEST_SITE_NAME);
        break;
      case "discharge":
        event = createDischargeEvent(patient, encounter, TEST_WARD_ID, TEST_WARD_NAME, TEST_SITE_NAME);
        break;
      case "transfer":
        event = createTransferEvent(
          patient,
          encounter,
          "ward-002",
          "Ward 2",
          TEST_SITE_NAME,
          "Bed 1"
        );
        break;
    }

    await publisher.publish(event);
  }

  console.log(`\n[Publisher] Published ${TEST_PATIENTS.length} ${action} events`);

  await publisher.close();
}

main().catch((error) => {
  console.error("Publisher failed:", error);
  process.exit(1);
});
