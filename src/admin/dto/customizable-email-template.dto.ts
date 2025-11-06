export interface CustomizableEmailTemplateDto {
  name: string;
  subject: string;
  customizableText: string;
  staticTemplate: string;
  isActive?: boolean;
}

export interface UpdateCustomizableTextDto {
  customizableText: string;
}

export interface SendCustomizableEmailDto {
  templateName: string;
  to: string;
  variables: Record<string, any>;
}