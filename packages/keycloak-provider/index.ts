import { Config as LoggerConfig, Logger, getLogger } from '@dataverse/logger';
import axios from 'axios';
import ApiError from '@dataverse/errors';
import qs from 'qs';
import { AdminGetUserResponse } from './types/AdminGetUserResponse';

export class KeyCloakAdminError extends ApiError {
  constructor(message: string, error?: any) {
    super(message, {}, error);
  }
}

export interface Config {
  keycloak_username: string;
  keycloak_client_id: string;
  keycloak_client_secret: string;
  keycloak_grant_type: string;
  keycloak_realm_name: string;
  keycloak_base_url: string;
}

export class KeyCloakAdminProvider {
  private logger?: Logger;

  private keycloak_username: string;

  private keycloak_client_id: string;

  private keycloak_client_secret: string;

  private keycloak_grant_type: string;

  private keycloak_realm_name: string;

  private keycloak_base_url: string;

  constructor(config: Config, loggerConfig?: LoggerConfig) {
    this.logger = loggerConfig ? getLogger(loggerConfig) : undefined;
    this.keycloak_username = config.keycloak_username;
    this.keycloak_client_id = config.keycloak_client_id;
    this.keycloak_client_secret = config.keycloak_client_secret;
    this.keycloak_grant_type = config.keycloak_grant_type;
    this.keycloak_realm_name = config.keycloak_realm_name;
    this.keycloak_base_url = config.keycloak_base_url;
  }

  private async getAccessToken() {
    let data = qs.stringify({
      username: this.keycloak_username,
      client_secret: this.keycloak_client_secret,
      grant_type: this.keycloak_grant_type,
      client_id: this.keycloak_client_id,
    });

    let config: any = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.keycloak_base_url}/realms/${this.keycloak_realm_name}/protocol/openid-connect/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: data,
    };

    try {
      this.logger?.debug('Getting Access token keycloak: %O');
      const response: any = await axios.request(config);
      return response.data.access_token;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new KeyCloakAdminError(`Could not get a access token`, error);
    }
  }

  public async createUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    emailVerified?: boolean;
    enabled?: boolean;
    workspaceId?: string;
    attributes: object;
  }): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      this.logger?.debug('Creating a new user in keycloak: %O', userData);
      try {
        await axios.request({
          method: 'post',
          url: `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          data: userData,
        });
      } catch (error: any) {
        if (error?.response?.data?.errorMessage === 'User exists with same username') {
          const resp = await axios.request({
            method: 'get',
            url: `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/?username=${userData.email}`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const id = resp.data[0].id;
          await axios.request({
            method: 'put',
            url: `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/${id}`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            data: userData,
          });
          return id;
        } else {
          throw error;
        }
      }
      const { data } = await axios.request({
        method: 'get',
        url: `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/?username=${userData.email}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return data[0].id;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new KeyCloakAdminError(`Could not create a new user: ${userData.email}`, error);
    }
  }

  public async getUser(username: string): Promise<AdminGetUserResponse> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Keycloak admin client is not initialized');
    } else {
      try {
        this.logger?.debug('Getting a user in keycloak: %O');
        const response = await axios.get(
          `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/${username}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        const transformedResponse: AdminGetUserResponse = {
          Enabled: response.data.enabled,
          UserCreateDate: new Date(response.data.createdTimestamp),
          Username: response.data.id,
          UserLastModifiedDate: new Date(response.data.createdTimestamp),
          UserAttributes: [
            ...Object.keys(response.data.attributes).map((key) => ({
              Name: key,
              Value: response.data.attributes[key][0],
            })),
            { Name: 'sub', Value: response.data.id },
            { Name: 'emailVerified', Value: response.data.emailVerified },
            { Name: 'given_name', Value: response.data.firstName },
            { Name: 'family_name', Value: response.data.lastName },
            { Name: 'email', Value: response.data.email },
          ],
        };
        return transformedResponse;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new KeyCloakAdminError(`Error while getting a user with ${username}`, error);
      }
    }
  }

  public async getUserList(queryParams?: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Keycloak admin client is not initialized');
    } else {
      try {
        this.logger?.debug('Getting a user in keycloak: %O');
        const response = await axios.get(
          `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users` + (queryParams ? queryParams : ''),
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        return response.data;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new KeyCloakAdminError(`Error while getting a users`, error);
      }
    }
  }

  public async deleteUser(username: string) {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Keycloak admin client is not initialized');
    } else {
      try {
        this.logger?.debug('deleting a user in keycloak: %O');
        const response = await axios.delete(
          `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/${username}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        return response;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new KeyCloakAdminError(`Error while deleting a user with ${username}`, error);
      }
    }
  }

  public async updateUser(userData: any, id: string) {
    try {
      this.logger?.debug('Updating the user in keycloak: %O', userData);
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Keycloak admin client is not initialized');
      }
      await axios.request({
        method: 'put',
        url: `${this.keycloak_base_url}/admin/realms/${this.keycloak_realm_name}/users/${id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        data: userData,
      });
    } catch (error) {
      console.log(error);
    }
  }
}

export default KeyCloakAdminProvider;
