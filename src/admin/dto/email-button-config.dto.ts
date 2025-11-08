export interface EmailButtonConfigDto {
  paymentButtonText?: string;
  dashboardButtonText?: string;
  editButtonText?: string;
  loginButtonText?: string;
}

export interface EmailButtonResponseDto {
  success: boolean;
  data: {
    paymentButtonText: string;
    dashboardButtonText: string;
    editButtonText: string;
    loginButtonText: string;
    staticUrls: {
      dashboardUrl: string;
      editProfileUrl: string;
      paymentUrl: string;
      loginUrl: string;
    };
    note: string;
  };
}

export interface UpdateButtonTextResponseDto {
  success: boolean;
  message: string;
  updatedConfigs: EmailButtonConfigDto;
  timestamp: string;
}