import { join } from 'path';
import { readFile } from 'fs/promises';
import nock from 'nock';
import { UnleashToggleProvider, BootstrapOptions, TogglesNotInitializedError } from '../index';

const config = {
  url: 'https://toggles.test.url',
  appName: 'test',
  instanceId: 'test',
  apiToken: 'test.token',
  refreshInterval: 0, // disable interval fetch that blocks tests exit
  disableMetrics: true, // disable interval fetch that blocks tests exit
  logger: {
    appName: 'toggle-provider.test',
    logLevel: 'error',
    logStyle: 'cli',
  },
};

const bootstrap: BootstrapOptions = {
  data: [
    {
      enabled: true,
      name: 'Enabled testing feature',
      description: '',
      project: 'default',
      stale: false,
      type: 'release',
      variants: [],
      strategies: [],
      impressionData: false,
    },
    {
      enabled: false,
      name: 'Disabled testing feature',
      description: '',
      project: 'default',
      stale: false,
      type: 'release',
      variants: [],
      strategies: [],
      impressionData: false,
    },
  ],
};

const toggleProvider = new UnleashToggleProvider(config);

const mockUnleashServer = () => {
  nock(`${config.url}`).post('/client/register').reply(200, {});
  nock(`${config.url}`).get('/client/features').reply(200, { features: [] });
};

describe('Toggle Provider', () => {
  afterEach(() => {
    toggleProvider.destroy();

    nock.abortPendingRequests();
    nock.cleanAll();
  });

  it('should throw an error when checking features before initializing', () => {
    expect(() => toggleProvider.isEnabled('Disabled testing feature')).toThrow(TogglesNotInitializedError);
    expect(() => toggleProvider.onChange(() => {})).toThrow(TogglesNotInitializedError);
  });

  describe('isEnabled', () => {
    it('should recognize enabled feature as enabled', async () => {
      mockUnleashServer();
      await toggleProvider.init(bootstrap);
      const isEnabled = toggleProvider.isEnabled('Enabled testing feature');
      expect(isEnabled).toBe(true);
    });

    it('should recognize existing disabled feature as disabled', async () => {
      mockUnleashServer();
      await toggleProvider.init(bootstrap);
      const isEnabled = toggleProvider.isEnabled('Disabled testing feature');
      expect(isEnabled).toBe(false);
    });

    it('should recognize missing feature as disabled', async () => {
      mockUnleashServer();
      await toggleProvider.init(bootstrap);
      const isEnabled = toggleProvider.isEnabled('Non-existing testing feature');
      expect(isEnabled).toBe(false);
    });
  });

  describe('onChange', () => {
    it('should trigger callback function on a change to feature inventory', async () => {
      mockUnleashServer();
      const mockCallback = jest.fn();
      const quickToggleProvider = new UnleashToggleProvider({ ...config, refreshInterval: 1500 });
      await quickToggleProvider.init(bootstrap);
      quickToggleProvider.onChange(mockCallback);

      nock(`${config.url}`)
        .get('/client/features')
        .reply(200, {
          features: [
            {
              enabled: true,
              name: 'Changed testing feature',
              description: '',
              project: 'default',
              stale: false,
              type: 'release',
              variants: [],
              strategies: [],
              impressionData: false,
            },
          ],
        });

      const waiter = new Promise((resolve) => {
        setTimeout(resolve, 3000);
      });

      await waiter;

      quickToggleProvider.destroy();

      expect(mockCallback).toBeCalledTimes(2); // 1 for bootstrap 1 for actual change
    });
  });

  describe('syncOpenApiSpec', () => {
    [
      {
        name: 'should keep object items with enabled feature toggle',
        inputFixture: 'openapi.object.input.json',
        outputFixture: 'openapi.object.input.json', // updated spec should equal input
        sampleFeatureToggleEnabled: true,
      },
      {
        name: 'should remove object items with disabled feature toggle',
        inputFixture: 'openapi.object.input.json',
        outputFixture: 'openapi.object.output.json',
        sampleFeatureToggleEnabled: false,
      },
      {
        name: 'should keep array items with enabled feature toggle',
        inputFixture: 'openapi.array.input.json',
        outputFixture: 'openapi.array.input.json', // updated spec should equal input
        sampleFeatureToggleEnabled: true,
      },
      {
        name: 'should remove array items with disabled feature toggle',
        inputFixture: 'openapi.array.input.json',
        outputFixture: 'openapi.array.output.json',
        sampleFeatureToggleEnabled: false,
      },
    ].forEach(({ name, inputFixture, outputFixture, sampleFeatureToggleEnabled }) => {
      it(name, async () => {
        const input = JSON.parse(await readFile(join(__dirname, 'fixtures', inputFixture), 'utf8'));
        const output = JSON.parse(await readFile(join(__dirname, 'fixtures', outputFixture), 'utf8'));
        const boot: BootstrapOptions = {
          data: [
            {
              enabled: sampleFeatureToggleEnabled,
              name: 'sample-feature-toggle',
              description: '',
              project: 'default',
              stale: false,
              type: 'release',
              variants: [],
              strategies: [],
              impressionData: false,
            },
          ],
        };

        mockUnleashServer();
        await toggleProvider.init(boot);
        const updatedOpenApiSpec = toggleProvider.syncOpenApiSpec(input);
        expect(updatedOpenApiSpec).toStrictEqual(output);
      });
    });
  });
});
