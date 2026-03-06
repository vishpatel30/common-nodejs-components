import { Config as LoggerConfig, getLogger, Logger } from '@dataverse/logger';
import {
  Admin,
  Consumer,
  ConsumerSubscribeTopics,
  EachMessagePayload,
  ITopicConfig,
  Kafka,
  logLevel,
  Producer,
  ProducerBatch,
  RecordMetadata,
  SASLOptions,
  TopicMessages,
} from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { KafkaConfig } from './types/kafka-config.interface';

export class KafkaClientProvider {
  private config: KafkaConfig;

  private logger?: Logger;

  private admin: Admin;

  private producer: Producer;

  private consumers: Array<Consumer> = [];

  private kafka: Kafka;

  constructor(config: KafkaConfig, username: string, password: string, loggerConfig?: LoggerConfig) {
    this.config = config;
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;

    this.kafka = this.initKafka(username, password);
    this.admin = this.kafka.admin();
    this.producer = this.kafka.producer();
  }

  public async initializeConnections(): Promise<void> {
    try {
      await Promise.all([this.admin.connect(), this.producer.connect()]);
      this.logger?.info(`Kafka client "${this.config.clientName}" connected`);
    } catch (error) {
      this.logger?.error('Error in connecting to Kafka: ', error);
      throw error;
    }
  }

  public async shutdown(cb?: Function): Promise<void> {
    try {
      await Promise.all([this.admin.disconnect(), this.producer.disconnect()]);
      await Promise.all(this.consumers?.map((consumer) => consumer.disconnect()));
      this.logger?.info(`Kafka client "${this.config.clientName}" disconnected`);
      if (cb) {
        cb(null);
      }
    } catch (error) {
      this.logger?.error('Error in disconnecting kafka client:', error);
      throw error;
    }
  }

  public sendBatch(topicName: string, messages: Array<any>): Promise<RecordMetadata[]> {
    const kafkaMessages: Array<any> = messages.map((message) => {
      return {
        key: uuidv4(), // FIX ME : user may need to set key explicitly
        value: JSON.stringify(message),
      };
    });

    const topicMessages: TopicMessages = {
      topic: topicName,
      messages: kafkaMessages,
    };

    const batch: ProducerBatch = {
      topicMessages: [topicMessages],
    };
    return this.producer.sendBatch(batch);
  }

  public async startConsumer(consumerGroupName: string, topicNames: Array<string>, cb?: Function): Promise<void> {
    const topics: ConsumerSubscribeTopics = {
      topics: topicNames,
      fromBeginning: false,
    };
    const consumer = this.kafka.consumer({
      groupId: consumerGroupName,
      sessionTimeout: this.config.sessionTimeout ?? 30000,
    });
    try {
      await consumer.connect();
      await consumer.subscribe(topics);
      await consumer.run({
        autoCommit: false,
        eachMessage: async (messagePayload: EachMessagePayload) => {
          const { topic, partition, message } = messagePayload;
          const prefix: string = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`;
          if (cb) await cb(messagePayload, prefix);
          await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
        },
      });
      this.consumers.push(consumer);
    } catch (error) {
      this.logger?.error(`Cannot consume topics ${topicNames}`, error);
      throw error;
    }
  }

  private initKafka(username: string, password: string): Kafka {
    let sasl = undefined;
    if (username !== '' && password !== '' && !this.config.sasl) {
      sasl = { mechanism: 'plain' as const, username, password };
    } else if (this.config.sasl) {
      sasl = this.config.sasl;
    }
    const kafka = new Kafka({
      clientId: this.config.clientName,
      brokers: this.config.brokers,
      sasl: sasl as SASLOptions,
      ssl: this.config.ssl ?? true,
      logLevel: logLevel.INFO,
      connectionTimeout: this.config.connectionTimeout,
    });
    return kafka;
  }

  public async createTopics(topics: ITopicConfig[]) {
    await this.admin.createTopics({
      topics: topics,
    });
  }

  public async deleteTopics(topics: string[]) {
    await this.admin.deleteTopics({
      topics,
    });
  }
}

export default KafkaClientProvider;
