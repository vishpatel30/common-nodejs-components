/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config as LoggerConfig } from '@dataverse/logger';
import { ConsumerRunConfig, EachMessagePayload } from 'kafkajs';
import KafkaClientProvider from '..';
import { KafkaConfig } from '../types/kafka-config.interface';

const mockProducerConnect = jest.fn();
const mockProducerDisconnect = jest.fn();
const mockProducerSendBatch = jest.fn();
const mockConsumerSubscribe = jest.fn();
const mockConsumerRun = jest.fn();
jest.mock('kafkajs', () => {
  return {
    Kafka: jest.fn().mockImplementation(() => {
      return {
        producer: jest.fn().mockImplementation(() => {
          return {
            connect: mockProducerConnect,
            disconnect: mockProducerDisconnect,
            sendBatch: mockProducerSendBatch,
          };
        }),
        consumer: jest.fn().mockImplementation(() => {
          return {
            connect: jest.fn(),
            disconnect: jest.fn(),
            subscribe: mockConsumerSubscribe,
            run: mockConsumerRun.mockImplementation((config?: ConsumerRunConfig | undefined) => {
              const payload: EachMessagePayload = {
                topic: 'topic',
                partition: 0,
                message: {
                  key: Buffer.from('key'),
                  value: Buffer.from('value'),
                  timestamp: 'timestamp',
                  attributes: 1,
                  offset: 'offset',
                  size: 2,
                },
                heartbeat: jest.fn(),
                pause: jest.fn(),
              };
              config?.eachMessage?.call(this, payload);
            }),
            commitOffsets: jest.fn(),
          };
        }),
        admin: jest.fn().mockImplementation(() => {
          return {
            connect: jest.fn(),
            disconnect: jest.fn(),
          };
        }),
        logger: jest.fn(),
      };
    }),
    logLevel: { INFO: 4 },
  };
});

describe('@dataverse/kafka-provider', () => {
  const username = 'user';
  const password = 'pass';
  const config: KafkaConfig = {
    clientName: 'clientName',
    brokers: [],
  };
  const loggerConfig: LoggerConfig = {
    appName: 'test-app-name',
    moduleName: 'kafka-test',
    logLevel: 'info',
    logStyle: 'cli',
  };
  let testObject: KafkaClientProvider;
  const messages = [{ msg: 'hello' }];
  const topicName = 'topic';
  const consumerGroupName = 'groupName';
  const uuid4Matcher = /^[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}$/;

  beforeEach(() => {
    testObject = new KafkaClientProvider(config, username, password, loggerConfig);
    mockProducerSendBatch.mockClear();
    mockConsumerSubscribe.mockClear();
    mockConsumerRun.mockClear();
  });

  it('should not throw when initializeConnections', async () => {
    // arrange
    let thrown = null;

    // act
    try {
      await testObject.initializeConnections();
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).toBeNull();
  });

  it('should throw given connect throws when initializeConnections', async () => {
    // arrange
    mockProducerConnect.mockRejectedValueOnce(new Error('dummy error'));
    let thrown = null;

    // act
    try {
      await testObject.initializeConnections();
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).not.toBeNull();
  });

  it('should not throw when shutdown', async () => {
    // arrange
    let thrown = null;
    const cb = jest.fn();
    await testObject.startConsumer(consumerGroupName, [topicName]);

    // act
    try {
      await testObject.shutdown(cb);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).toBeNull();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should throw given disconnect throws when shutdown', async () => {
    // arrange
    mockProducerDisconnect.mockRejectedValueOnce(new Error('dummy error'));
    let thrown = null;
    const cb = jest.fn();

    // act
    try {
      await testObject.shutdown(cb);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(thrown).not.toBeNull();
    expect(cb).toHaveBeenCalledTimes(0);
  });

  it('should call sendBatch when sendBatch', async () => {
    // act
    await testObject.sendBatch(topicName, messages);

    // assert
    expect(mockProducerSendBatch).toHaveBeenCalledTimes(1);
    expect(mockProducerSendBatch).toHaveBeenCalledWith({
      topicMessages: [
        {
          messages: [
            {
              key: expect.stringMatching(uuid4Matcher),
              value: '{"msg":"hello"}',
            },
          ],
          topic: 'topic',
        },
      ],
    });
  });

  it('should call subscribe and run when startConsumer', async () => {
    // arrange
    const cb = jest.fn();

    // act
    await testObject.startConsumer(consumerGroupName, [topicName], cb);

    // assert
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(expect.anything(), 'topic[0 | offset] / timestamp');
    expect(mockConsumerSubscribe).toHaveBeenCalledTimes(1);
    expect(mockConsumerRun).toHaveBeenCalledTimes(1);
  });

  it('should throw given subscribe throws when startConsumer', async () => {
    // arrange
    mockConsumerSubscribe.mockRejectedValueOnce(new Error('dummy error'));
    const cb = jest.fn();
    let thrown = null;

    // act
    try {
      await testObject.startConsumer(consumerGroupName, [topicName], cb);
    } catch (e) {
      thrown = e;
    }

    // assert
    expect(cb).toHaveBeenCalledTimes(0);
    expect(thrown).not.toBeNull();
  });
});
