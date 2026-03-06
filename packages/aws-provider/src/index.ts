import * as AWS from 'aws-sdk';
import { Config as LoggerConfig, getLogger, Logger } from '@dataverse/logger';

export type AWSProviderCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

export type TimePeriod = {
  Start: string;
  End: string;
};

export type Granularity = 'MONTHLY' | 'DAILY' | 'HOURLY';

export type Metrics = (
  | 'BLENDED_COST'
  | 'UNBLENDED_COST'
  | 'AMORTIZED_COST'
  | 'NET_AMORTIZED_COST'
  | 'NET_UNBLENDED_COST'
  | 'USAGE_QUANTITY'
  | 'NORMALIZED_USAGE_AMOUNT'
)[];

export type GroupByKey =
  | 'AZ'
  | 'INSTANCE_TYPE'
  | 'LINKED_ACCOUNT'
  | 'OPERATION'
  | 'PURCHASE_TYPE'
  | 'SERVICE'
  | 'USAGE_TYPE'
  | 'PLATFORM'
  | 'TENANCY'
  | 'RECORD_TYPE'
  | 'LEGAL_ENTITY_NAME'
  | 'INVOICING_ENTITY'
  | 'DEPLOYMENT_OPTION'
  | 'DATABASE_ENGINE'
  | 'CACHE_ENGINE'
  | 'INSTANCE_TYPE_FAMILY'
  | 'REGION'
  | 'BILLING_ENTITY'
  | 'RESERVATION_ID'
  | 'SAVINGS_PLANS_TYPE'
  | 'SAVINGS_PLAN_ARN'
  | 'OPERATING_SYSTEM';

export type GroupBy = Array<{
  Type: string;
  Key: GroupByKey;
}>;

export type GetCostForDateOptions = {
  TimePeriod: TimePeriod;
  Granularity: Granularity;
  Metrics: Metrics;
  GroupBy: GroupBy;
  NextPageToken?: string;
} & AWS.CostExplorer.GetCostAndUsageRequest;

class AWSProvider {
  private s3!: AWS.S3;
  private ce!: AWS.CostExplorer;

  private logger?: Logger;

  constructor(loggerConfig?: LoggerConfig) {
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;
  }

  public async initializeAWSConnection(credentials: AWSProviderCredentials) {
    try {
      // Initialize AWS SDK with credentials
      this.s3 = new AWS.S3({
        credentials,
      });

      // Initialize the Cost Explorer
      this.ce = new AWS.CostExplorer({
        credentials,
      });

      this.logger?.info(`Connected AWS to SDK successfully`);
    } catch (err) {
      this.logger?.error(err instanceof Error ? err.message : err);
      throw err;
    }
  }

  async uploadFile(bucketName: string, key: string, fileData: Buffer): Promise<string> {
    const params: AWS.S3.Types.PutObjectRequest = {
      Bucket: bucketName,
      Key: key,
      Body: fileData,
    };

    try {
      const result = await this.s3.upload(params).promise();
      this.logger?.info(`File uploaded successfully: ${result.Location}`);
      return result.Location;
    } catch (error) {
      this.logger?.error(`Error uploading file: ${error}`);
      throw error;
    }
  }

  async getObject(bucketName: string, key: string): Promise<string> {
    const params: AWS.S3.Types.GetObjectRequest = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      const data = await this.s3.getObject(params).promise();
      this.logger?.info(`Object retrieved successfully: ${key}`);
      return data?.Body?.toString() || '';
    } catch (error) {
      this.logger?.error(`Error retrieving object: ${error}`);
      throw error;
    }
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    const params: AWS.S3.Types.DeleteObjectRequest = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
      this.logger?.info(`Object deleted successfully: ${key}`);
    } catch (error) {
      this.logger?.error(`Error deleting object: ${error}`);
      throw error;
    }
  }

  async getCostForDate(
    options: GetCostForDateOptions,
  ): Promise<AWS.CostExplorer.GetCostAndUsageResponse | { error?: any; message?: string }> {
    try {
      const costData = await this.ce.getCostAndUsage(options).promise();

      if (costData.ResultsByTime && costData.ResultsByTime.length > 0) {
        // Data is available, process and return it
        return costData;
      } else {
        // No data available for the specified date range
        this.logger?.error(`DataUnavailableException: ${costData}`);
        return {
          error: 'DataUnavailableException',
          message: 'No cost data available for the specified date range.',
        };
      }
    } catch (error: any) {
      // Handle the DataUnavailableException
      if (error.code === 'DataUnavailableException') {
        this.logger?.error(`DataUnavailableException: ${error}`);
        return {
          error: 'DataUnavailableException',
          message: 'Cost data is not available for the specified time period.',
        };
      } else {
        // Handle other errors
        this.logger?.error(`Error querying cost data: ${error}`);
        return {
          error: JSON.stringify(error),
          message: 'Cost data could not be fetched.',
        };
      }
    }
  }
}

export default AWSProvider;
