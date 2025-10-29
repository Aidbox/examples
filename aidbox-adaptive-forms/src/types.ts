// FHIR SDC Adaptive Questionnaire types

export interface QuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  questionnaire?: string;
  status?: string;
  item?: QuestionnaireResponseItem[];
}

export interface QuestionnaireResponseItem {
  linkId: string;
  text?: string;
  answer?: QuestionnaireResponseAnswer[];
  item?: QuestionnaireResponseItem[];
}

export interface QuestionnaireResponseAnswer {
  valueInteger?: number;
  valueString?: string;
  valueBoolean?: boolean;
  valueCoding?: Coding;
  item?: QuestionnaireResponseItem[];
}

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface Questionnaire {
  resourceType: 'Questionnaire';
  id?: string;
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status: string;
  item?: QuestionnaireItem[];
  contained?: any[];
  extension?: Extension[];
}

export interface QuestionnaireItem {
  linkId: string;
  text?: string;
  type: string;
  required?: boolean;
  repeats?: boolean;
  answerOption?: AnswerOption[];
  item?: QuestionnaireItem[];
  code?: Coding[];
  extension?: Extension[];
}

export interface AnswerOption {
  valueCoding?: Coding;
  valueInteger?: number;
  valueString?: string;
}

export interface Extension {
  url: string;
  valueInteger?: number;
  valueString?: string;
  valueBoolean?: boolean;
  valueUri?: string;
}

export interface Parameters {
  resourceType: 'Parameters';
  parameter: Parameter[]
}

export interface Parameter {
  name: string;
  resource?: QuestionnaireResponse;
}

export interface NextQuestionParameter extends Parameter {
  name: 'questionnaire-response';
  resource: QuestionnaireResponse;
}

export interface NextQuestionRequest extends Parameters {
    parameter: [
      NextQuestionParameter
    ]
}

export interface QuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  questionnaire?: string;
  status?: string;
  item?: QuestionnaireResponseItem[];
  contained?: Questionnaire[];
}

export interface NextQuestionResponse {
  resourceType: 'QuestionnaireResponse';
  questionnaire?: string;
  status?: string;
  item?: QuestionnaireResponseItem[];
  contained?: Questionnaire[];
}
