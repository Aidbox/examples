/**
 * RabbitMQ Event Consumer
 * Consumes ADT fat events, maps to FHIR, stores in Aidbox
 * No HIS API calls needed — all data comes from the event
 */

import * as amqp from "amqplib";
import { mapPatientFromEvent, mapEncounterFromEvent, mapLocation } from "../shared/fhir-mapper";
import { createFhirClient, FhirClient } from "./fhir-client";
import type { ADTEvent, EventEnvelope } from "../shared/types/events";

const QUEUE_NAME = "adt-events";
const EXCHANGE_NAME = "his-events";
const ROUTING_KEY = "adt.#";

interface ConsumerConfig {
  rabbitmqUrl: string;
  prefetch: number;
}

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection["createChannel"]>>;

class EventConsumer {
  private config: ConsumerConfig;
  private fhirClient: FhirClient;
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;

  constructor(config: ConsumerConfig, fhirClient: FhirClient) {
    this.config = config;
    this.fhirClient = fhirClient;
  }

  async connect(): Promise<void> {
    console.log(`[Consumer] Connecting to RabbitMQ: ${this.config.rabbitmqUrl}`);

    this.connection = await amqp.connect(this.config.rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    await this.channel.prefetch(this.config.prefetch);
    await this.channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    await this.channel.assertQueue(QUEUE_NAME, { durable: true });
    await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    console.log(`[Consumer] Connected and queue '${QUEUE_NAME}' bound to exchange '${EXCHANGE_NAME}'`);
  }

  async start(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized. Call connect() first.");
    }

    console.log(`[Consumer] Starting to consume from queue '${QUEUE_NAME}'`);

    await this.channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const envelope = JSON.parse(msg.content.toString()) as EventEnvelope;
        console.log(`[Consumer] Received event: ${envelope.id} (${envelope.payload.action})`);

        await this.processEvent(envelope.payload);

        this.channel?.ack(msg);
        console.log(`[Consumer] Event ${envelope.id} processed successfully`);
      } catch (error) {
        console.error(`[Consumer] Error processing event:`, error);
        this.channel?.nack(msg, false, true);
      }
    });
  }

  private async processEvent(event: ADTEvent): Promise<void> {
    switch (event.action) {
      case "admit":
        await this.handleAdmit(event);
        break;
      case "discharge":
        await this.handleDischarge(event);
        break;
      case "transfer":
        await this.handleTransfer(event);
        break;
      default:
        console.warn(`[Consumer] Unknown action: ${(event as ADTEvent).action}`);
    }
  }

  private async handleAdmit(event: ADTEvent): Promise<void> {
    console.log(`[Consumer] Processing admit for patient ${event.patient.patientId} to ward ${event.encounter.wardId}`);

    const patient = mapPatientFromEvent(event.patient);
    const location = mapLocation(
      event.encounter.wardId,
      event.encounter.wardName,
      event.encounter.siteName
    );
    const encounter = mapEncounterFromEvent(
      event.encounter,
      `Patient/${patient.id}`,
      `Location/${location.id}`
    );

    await this.fhirClient.storeLocation(location);
    await this.fhirClient.storePatient(patient);
    await this.fhirClient.storeEncounter(encounter);

    console.log(`[Consumer] Stored Patient/${patient.id}, Encounter/${encounter.id}, Location/${location.id}`);
  }

  private async handleDischarge(event: ADTEvent): Promise<void> {
    console.log(`[Consumer] Processing discharge for patient ${event.patient.patientId}`);

    const patient = mapPatientFromEvent(event.patient);
    const location = mapLocation(
      event.encounter.wardId,
      event.encounter.wardName,
      event.encounter.siteName
    );
    const encounter = mapEncounterFromEvent(
      { ...event.encounter, status: "finished" },
      `Patient/${patient.id}`,
      `Location/${location.id}`
    );

    await this.fhirClient.storeEncounter(encounter);

    console.log(`[Consumer] Updated Encounter/${encounter.id} to finished`);
  }

  private async handleTransfer(event: ADTEvent): Promise<void> {
    console.log(`[Consumer] Processing transfer for patient ${event.patient.patientId} to ward ${event.encounter.wardId}`);
    await this.handleAdmit(event);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    console.log("[Consumer] Connection closed");
  }
}

async function waitForRabbitMQ(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const conn = await amqp.connect(url);
      await conn.close();
      return;
    } catch {
      console.log(`[Consumer] Waiting for RabbitMQ... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Failed to connect to RabbitMQ after max retries");
}

async function waitForFhirServer(fhirClient: FhirClient, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const healthy = await fhirClient.healthCheck();
    if (healthy) return;
    console.log(`[Consumer] Waiting for FHIR Server... (${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("FHIR Server not available after max retries");
}

async function main(): Promise<void> {
  console.log("Event Consumer starting...");

  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://localhost";
  const prefetch = parseInt(process.env.PREFETCH ?? "10");

  await waitForRabbitMQ(rabbitmqUrl);
  console.log("[Consumer] RabbitMQ is available");

  const fhirClient = createFhirClient();

  await waitForFhirServer(fhirClient);
  console.log("[Consumer] FHIR Server is available");

  const consumer = new EventConsumer({ rabbitmqUrl, prefetch }, fhirClient);

  process.on("SIGINT", async () => {
    console.log("\n[Consumer] Shutting down...");
    await consumer.close();
    process.exit(0);
  });

  await consumer.connect();
  await consumer.start();

  console.log("[Consumer] Ready and waiting for events");
}

main().catch((error) => {
  console.error("Consumer failed:", error);
  process.exit(1);
});
