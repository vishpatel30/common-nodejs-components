export interface AttributeType {
  Name: string | undefined;
  Value?: string;
}
export declare const DeliveryMediumType: {
  readonly EMAIL: 'EMAIL';
  readonly SMS: 'SMS';
};
export type DeliveryMediumTypeR = typeof DeliveryMediumType[keyof typeof DeliveryMediumType];

export interface MFAOptionType {
  DeliveryMedium?: DeliveryMediumTypeR | string;
  AttributeName?: string;
}

export declare const UserStatusType: {
  readonly ARCHIVED: 'ARCHIVED';
  readonly COMPROMISED: 'COMPROMISED';
  readonly CONFIRMED: 'CONFIRMED';
  readonly FORCE_CHANGE_PASSWORD: 'FORCE_CHANGE_PASSWORD';
  readonly RESET_REQUIRED: 'RESET_REQUIRED';
  readonly UNCONFIRMED: 'UNCONFIRMED';
  readonly UNKNOWN: 'UNKNOWN';
};

export type UserStatusTypeR = typeof UserStatusType[keyof typeof UserStatusType];

export interface AdminGetUserResponse {
  Username: string | undefined;
  UserAttributes?: AttributeType[];
  UserCreateDate?: Date;
  UserLastModifiedDate?: Date;
  Enabled?: boolean;
  UserStatus?: UserStatusTypeR | string;
  MFAOptions?: MFAOptionType[];
  PreferredMfaSetting?: string;
  UserMFASettingList?: string[];
}
