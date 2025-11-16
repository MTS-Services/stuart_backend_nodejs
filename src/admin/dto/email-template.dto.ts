export interface EmailTemplateDto {
  name: string;
  subject: string;
  body: string;
  html_template?: string;
  components?: ComponentDto[];
  settings?: TemplateSettingsDto;
  variables?: VariableDto[];
  preheader?: string;
  is_active?: boolean;
}

export interface ComponentDto {
  id: string | number;
  type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'footer';
  props: Record<string, any>;
}

export interface TemplateSettingsDto {
  subject?: string;
  preheader?: string;
  backgroundColor?: string;
  containerWidth?: number;
  fontFamily?: string;
}

export interface VariableDto {
  key: string;
  label: string;
  defaultValue: string;
  description?: string;
  category?: string;
}

export interface EmailTestDto {
  email: string;
  variables?: Record<string, any>;
}

export interface EmailPreviewDto {
  variables?: Record<string, any>;
}

export interface DuplicateTemplateDto {
  sourceTemplateName: string;
  newTemplateName: string;
}

export interface EmailTemplateResponseDto {
  success: boolean;
  message?: string;
  data?: EmailTemplateDto;
  timestamp?: string;
}

export interface EmailTemplatesListDto {
  success: boolean;
  data?: EmailTemplateDto[];
  count?: number;
}

export interface EmailVariablesResponseDto {
  success: boolean;
  data?: {
    global?: VariableDto[];
    authentication?: VariableDto[];
    profile?: VariableDto[];
    payment?: VariableDto[];
    buttons?: VariableDto[];
  };
}