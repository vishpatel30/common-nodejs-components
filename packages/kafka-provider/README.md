# `@dataverse/kafka-provider`

> KafkaJS Facade to use in dataverse NodeJS projects

## Config

| Name                                        | Description                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------  |
| clientName                                  | The name of the Kafka client                                                                    |
| brokers                                     | An array of Kafka brokers with their ports                                                      |
| connectionTimeout                           | Timeout value (ms) for the Kafka connection. Default value is 1000ms. The package trows error if the connection takes more than this value |

## Usage

```js
import KafkaClientProvider from '@dataverse/kafka-provider';
import { KafkaConfig } from '@dataverse/kafka-provider/src/types/kafka-config.interface';
import { Config as LoggerConfig } from '@dataverse/logger';
import {
  appName,
  kafkaBrokers,
  kafkaClientName,
  kafkaPassword,
  kafkaUserName,
  loggerLogLevel,
  loggerLogStyle,
} from '../config/config';

const config: KafkaConfig = {
  clientName: kafkaClientName,
  brokers: kafkaBrokers,
};

const loggerConfig: LoggerConfig = {
  logLevel: loggerLogLevel,
  logStyle: loggerLogStyle,
  appName: appName,
  moduleName: 'KafkaProvider',
};

const provider = new KafkaClientProvider(config, kafkaUserName, kafkaPassword, loggerConfig);

export default provider;

// Initialize connection
import kafkaClient from './providers/kafkaConnect';
await kafkaClient.initializeConnections();

// Send events
await kafkaClient.sendBatch(topicName, messages);
```
