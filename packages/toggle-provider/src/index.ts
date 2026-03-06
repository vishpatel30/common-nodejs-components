import { Logger, getLogger, Config as LoggerConfig } from '@dataverse/logger';
import { startUnleash, Unleash, InMemStorageProvider } from 'unleash-client';

export interface ToggleProviderConfig {
  /** URL to Unleash server (not proxy but the actual instance) */
  url: string;

  /** app name for browser and metric reasons */
  appName: string;

  /** identity the instance */
  instanceId?: string;

  /** token to authorize API requests (taken from Unleash) */
  apiToken: string;

  /** A config for the logger */
  logger: Omit<LoggerConfig, 'moduleName'>;

  /** How often does unleash client refreshes the toggles status */
  refreshInterval?: number;

  /** Should the client register with the server and send usage metrics */
  disableMetrics?: boolean;

  /** Which environment in Unleash to connect to */
  environment?: string;
}

export interface ToggleProvider {
  init(): Promise<void>;
  isEnabled(feature: string): boolean;
  onChange(eventHandler: Function): void;
  destroy(): void;
  syncOpenApiSpec(spec: any): any;
}

export interface UnleashFeature {
  enabled: boolean;
  name: string;
  description: string;
  project: string;
  stale: boolean;
  type: 'release' | 'experiment' | 'operational' | 'kill switch' | 'permission ';
  variants: Array<any>;
  strategies: Array<any>;
  impressionData: boolean;
}

export interface BootstrapOptions {
  data: Array<UnleashFeature>;
}

export class TogglesNotInitializedError extends Error {
  constructor() {
    super('Connection to feature toggle API server was not initialized yet');
  }
}

export class UnleashToggleProvider implements ToggleProvider {
  private client?: Unleash;

  private logger: Logger;

  private config: ToggleProviderConfig;

  private readonly FEATURE_TOGGLE_KEY = 'x-feature-toggle';

  constructor(config: ToggleProviderConfig) {
    this.config = config;
    this.logger = getLogger({ ...this.config.logger, moduleName: 'UnleashToggleProvider' });
  }

  public async init(bootstrap?: BootstrapOptions) {
    this.logger.info('Initializing feature toggles ...');

    if (this.client) {
      this.logger.warn('A client is already initialized, using the existing one');
      return;
    }

    this.client = await startUnleash({
      url: this.config.url,
      appName: this.config.appName,
      instanceId: this.config.instanceId,
      customHeaders: {
        Authorization: this.config.apiToken,
      },
      bootstrap,
      refreshInterval: this.config.refreshInterval,
      environment: this.config.environment,
      disableMetrics: this.config.disableMetrics,
      storageProvider: new InMemStorageProvider(),
    });

    this.client.on('ready', () => {
      this.logger.debug('feature toggles are ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('There was an error fetching toggles: %O', error);
    });

    this.client.on('synchronized', () => {
      this.logger.debug('Feature toggles synchronized');
    });

    this.client.on('registered', () => {
      this.logger.info('Application was registered with the feature toggle API server');
    });

    this.client.on('changed', (data) => {
      this.logger.debug('Feature toggle state has changed %O', data);
    });
  }

  public isEnabled(feature: string): boolean {
    if (!this.client) {
      throw new TogglesNotInitializedError();
    }
    this.logger.debug(`Checking feature '${feature}' availability...`);
    const featureStatus = this.client.isEnabled(feature);
    this.logger.debug(`Feature '${feature}' is enabled: ${featureStatus}`);
    return featureStatus;
  }

  public onChange(eventHandler: Function) {
    if (!this.client) {
      throw new TogglesNotInitializedError();
    }
    this.client.on('changed', () => {
      this.logger.info('Feature toggle state has changed for registered handler');
      eventHandler();
    });
  }

  public destroy(): void {
    this.logger.info('Closing connection to feature toggle API server');
    if (!this.client) {
      this.logger.info('Connection to feature toggle API server was never established');
      return;
    }
    this.client.destroy();
    this.client = undefined;
    this.logger.info('Connection to feature toggle API server closed');
  }

  public syncOpenApiSpec(spec: any): any {
    this.logger.info('Applying feature toggle config to openapi spec...');

    const traverse = (node: any): any => {
      if (typeof node !== 'object' || node === null || node === undefined) {
        return node;
      }
      const entries = Object.entries(node);
      const filteredEntries = entries.map(([key, value]: [string, any]) => {
        if (!Array.isArray(value) && typeof value !== 'object') {
          this.logger.silly(`Triggering non array, non object parsing, Key: ${key}, value: ${JSON.stringify(value)}`);
          return [key, value];
        }

        if (Array.isArray(value)) {
          this.logger.silly(`Triggering array parsing, Key: ${key}, value: ${JSON.stringify(value)}`);

          // handle the case when array contains objects with feature flag directly on them
          const filteredArrayValues = value.filter((val: any) => {
            if (val !== null && val !== undefined && Object.keys(val).includes(this.FEATURE_TOGGLE_KEY)) {
              const enabled = this.isEnabled(val[this.FEATURE_TOGGLE_KEY]);
              this.logger.silly(`[Array] Feature ${key}=${val[this.FEATURE_TOGGLE_KEY]} enabled: ${enabled}`);
              return enabled; // filter the object based on whether the feature is enabled or not
            }
            return true; // every other object is not filtered
          });

          return [key, filteredArrayValues.map(traverse)];
        }

        this.logger.silly(`Triggering object parsing, Key: ${key}, value: ${JSON.stringify(value)}`);
        // filter entry where value is object and has toggle key
        if (Object.keys(value).includes(this.FEATURE_TOGGLE_KEY)) {
          const enabled = this.isEnabled(value[this.FEATURE_TOGGLE_KEY]);
          this.logger.silly(`Feature ${key}=${value[this.FEATURE_TOGGLE_KEY]} enabled: ${enabled}`);

          if (!enabled) {
            this.logger.silly('FEature is disabled, returning false from filter function');
            return []; // remove node with the disabled feature
          }
        }

        // If not disabled feature for node was found go deeper
        return [key, traverse(value)];
      });

      return Object.fromEntries(filteredEntries.filter((entry) => entry.length));
    };

    const filteredSpec = traverse(spec); // TODO: add max traverse depth for safety
    this.logger.silly('Filtered spec: %s', JSON.stringify(filteredSpec, null, 2));
    return filteredSpec;
  }
}
