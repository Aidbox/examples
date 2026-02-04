import React from "react";
import {
  BaseQuestionnaireResponseForm,
  type FormWrapperProps,
} from "@beda.software/fhir-questionnaire/components/QuestionnaireResponseForm/BaseQuestionnaireResponseForm";
import type { GroupItemProps } from "@beda.software/fhir-questionnaire/components/QuestionnaireResponseForm/BaseQuestionnaireResponseForm/GroupComponent";
import {
  fromQuestionnaireResponseFormData,
  toQuestionnaireResponseFormData,
  type QuestionnaireResponseFormData,
} from "@beda.software/fhir-questionnaire/components/QuestionnaireResponseForm/questionnaire-response-form-data";
import {
  findAnswersForQuestion,
  getAnswerValues,
  useQuestionnaireResponseFormContext,
} from "sdc-qrf";
import type { AnswerValue, FormItems, QuestionItemProps } from "sdc-qrf";
import type { QuestionnaireContext } from "sdc-smart-web-messaging-react";

type BedaFormProps = {
  questionnaire: fhir4.Questionnaire;
  questionnaireResponse: fhir4.QuestionnaireResponse | null;
  context: QuestionnaireContext | null;
  onResponseChange: (response: fhir4.QuestionnaireResponse) => void;
};

type AnswerValueType = QuestionItemProps["questionItem"]["type"];

function wrapAnswerValue(type: AnswerValueType, value: unknown): AnswerValue | null {
  if (type === "choice" || type === "open-choice") {
    if (value && typeof value === "object") {
      return { Coding: value as AnswerValue["Coding"] };
    }
    return { string: String(value) };
  }
  if (type === "text") {
    return { string: String(value) };
  }
  if (type === "attachment") {
    return { Attachment: value as AnswerValue["Attachment"] };
  }
  if (type === "reference") {
    return { Reference: value as AnswerValue["Reference"] };
  }
  if (type === "quantity") {
    return { Quantity: value as AnswerValue["Quantity"] };
  }
  return { [type]: value } as AnswerValue;
}

function toR4bQuestionnaire(value: fhir4.Questionnaire): fhir4b.Questionnaire {
  return value as unknown as fhir4b.Questionnaire;
}

function toR4bQuestionnaireResponse(
  value: fhir4.QuestionnaireResponse
): fhir4b.QuestionnaireResponse {
  return value as unknown as fhir4b.QuestionnaireResponse;
}

function toR4QuestionnaireResponse(
  value: fhir4b.QuestionnaireResponse
): fhir4.QuestionnaireResponse {
  return value as unknown as fhir4.QuestionnaireResponse;
}

function buildLaunchContextParameters(
  context: QuestionnaireContext | null
): fhir4b.ParametersParameter[] {
  if (!context?.launchContext?.length) return [];
  return context.launchContext.map((item) => {
    if (item.contentResource) {
      return {
        name: item.name,
        resource: item.contentResource as fhir4b.FhirResource,
      };
    }
    if (item.contentReference) {
      return {
        name: item.name,
        valueReference: item.contentReference as fhir4b.Reference,
      };
    }
    return { name: item.name };
  });
}

function GroupItem({ questionItem, children, addItem }: GroupItemProps) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {questionItem.text ? (
        <div style={{ fontWeight: 600, marginBottom: "8px" }}>
          {questionItem.text}
        </div>
      ) : null}
      <div style={{ paddingLeft: 12 }}>{children}</div>
      {questionItem.repeats && addItem ? (
        <button type="button" onClick={addItem} style={{ marginTop: 8 }}>
          Add
        </button>
      ) : null}
    </div>
  );
}

function getAnswerValue(
  questionItem: QuestionItemProps["questionItem"],
  parentPath: string[],
  formValues: FormItems
) {
  if (!questionItem.linkId) return undefined;
  const answers = findAnswersForQuestion(
    questionItem.linkId,
    parentPath,
    formValues
  );
  const values = getAnswerValues(answers);
  return values[0];
}

function QuestionField({ questionItem, context, parentPath }: QuestionItemProps) {
  const { formValues, setFormValues } = useQuestionnaireResponseFormContext();
  void context;
  if (!questionItem.linkId) return null;

  const answerValue = getAnswerValue(questionItem, parentPath, formValues);
  const fieldPath = [...parentPath, questionItem.linkId];
  const isReadOnly = Boolean(questionItem.readOnly);

  const updateValue = (nextValue: AnswerValue | null) => {
    const nextAnswers = nextValue ? [{ value: nextValue }] : undefined;
    setFormValues(formValues, fieldPath, nextAnswers);
  };

  switch (questionItem.type) {
    case "display":
      return <div style={{ marginBottom: "12px" }}>{questionItem.text}</div>;
    case "boolean":
      return (
        <label style={{ display: "block", marginBottom: "12px" }}>
          <input
            type="checkbox"
            checked={Boolean(answerValue?.boolean)}
            disabled={isReadOnly}
            onChange={(event) =>
              updateValue(
                wrapAnswerValue("boolean", event.target.checked) ?? null
              )
            }
          />{" "}
          {questionItem.text}
        </label>
      );
    case "integer":
    case "decimal": {
      const value =
        (answerValue?.[questionItem.type as keyof AnswerValue] as
          | number
          | string
          | undefined) ?? "";
      return (
        <label style={{ display: "block", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {questionItem.text}
          </div>
          <input
            type="number"
            value={value as number | string}
            disabled={isReadOnly}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") {
                updateValue(null);
                return;
              }
              const numeric = Number(raw);
              updateValue(wrapAnswerValue(questionItem.type, numeric) ?? null);
            }}
          />
        </label>
      );
    }
    case "date":
    case "dateTime":
    case "time": {
      const value =
        (answerValue?.[questionItem.type as keyof AnswerValue] as
          | string
          | undefined) ?? "";
      const inputType =
        questionItem.type === "dateTime" ? "datetime-local" : questionItem.type;
      return (
        <label style={{ display: "block", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {questionItem.text}
          </div>
          <input
            type={inputType}
            value={value as string}
            disabled={isReadOnly}
            onChange={(event) => {
              const raw = event.target.value;
              if (!raw) {
                updateValue(null);
                return;
              }
              updateValue(wrapAnswerValue(questionItem.type, raw) ?? null);
            }}
          />
        </label>
      );
    }
    case "choice":
    case "open-choice": {
      const options =
        questionItem.answerOption?.map((option) => {
          if (option.valueCoding) {
            const coding = option.valueCoding;
            return {
              label: coding.display ?? coding.code ?? "(choice)",
              value: JSON.stringify(coding),
              coding,
            };
          }
          if (option.valueString) {
            return {
              label: option.valueString,
              value: option.valueString,
              string: option.valueString,
            };
          }
          return null;
        }) ?? [];
      const filteredOptions = options.filter(
        (option): option is NonNullable<typeof option> => Boolean(option)
      );
      const selected = answerValue?.Coding
        ? JSON.stringify(answerValue.Coding)
        : answerValue?.string ?? "";

      return (
        <label style={{ display: "block", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {questionItem.text}
          </div>
          <select
            value={selected}
            disabled={isReadOnly}
            onChange={(event) => {
              const raw = event.target.value;
              if (!raw) {
                updateValue(null);
                return;
              }
              const match = filteredOptions.find((opt) => opt.value === raw);
              if (match?.coding) {
                updateValue({ Coding: match.coding });
                return;
              }
              if (match?.string) {
                updateValue({ string: match.string });
              }
            }}
          >
            <option value="">Select</option>
            {filteredOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    default: {
      const value = answerValue?.string ?? "";
      const isMultiline = questionItem.type === "text";
      const inputId = `field-${questionItem.linkId}`;
      return (
        <div style={{ display: "block", marginBottom: "12px" }}>
          <label
            htmlFor={inputId}
            style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}
          >
            {questionItem.text}
          </label>
          {isMultiline ? (
            <textarea
              id={inputId}
              value={value}
              disabled={isReadOnly}
              onChange={(event) =>
                updateValue(
                  wrapAnswerValue(questionItem.type, event.target.value) ?? null
                )
              }
            />
          ) : (
            <input
              id={inputId}
              type="text"
              value={value}
              disabled={isReadOnly}
              onChange={(event) =>
                updateValue(
                  wrapAnswerValue(questionItem.type, event.target.value) ?? null
                )
              }
            />
          )}
        </div>
      );
    }
  }
}

const FormWrapper = ({ handleSubmit, items }: FormWrapperProps) => {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {items}
    </form>
  );
};

export const BedaForm = ({
  questionnaire,
  questionnaireResponse,
  context,
  onResponseChange,
}: BedaFormProps) => {
  const baseResponse = React.useMemo<fhir4b.QuestionnaireResponse>(
    () =>
      questionnaireResponse != null
        ? toR4bQuestionnaireResponse(questionnaireResponse)
        : {
            resourceType: "QuestionnaireResponse",
            status: "in-progress",
            item: [],
          },
    [questionnaireResponse]
  );

  const r4bQuestionnaire = React.useMemo(
    () => toR4bQuestionnaire(questionnaire),
    [questionnaire]
  );

  const launchContextParameters = React.useMemo(
    () => buildLaunchContextParameters(context),
    [context]
  );

  const formData = React.useMemo(
    () =>
      toQuestionnaireResponseFormData(
        r4bQuestionnaire,
        baseResponse,
        launchContextParameters
      ),
    [r4bQuestionnaire, baseResponse, launchContextParameters]
  );

  const handleEdit = React.useCallback(
    async (updatedFormData: QuestionnaireResponseFormData) => {
      const { questionnaireResponse: updatedResponse } =
        fromQuestionnaireResponseFormData(updatedFormData);
      onResponseChange(toR4QuestionnaireResponse(updatedResponse));
    },
    [onResponseChange]
  );

  const questionItemComponents = React.useMemo(
    () => ({
      string: QuestionField,
      text: QuestionField,
      integer: QuestionField,
      decimal: QuestionField,
      boolean: QuestionField,
      date: QuestionField,
      dateTime: QuestionField,
      time: QuestionField,
      choice: QuestionField,
      "open-choice": QuestionField,
      display: QuestionField,
    }),
    []
  );

  return (
    <BaseQuestionnaireResponseForm
      formData={formData}
      onEdit={handleEdit}
      onSubmit={handleEdit}
      widgetsByQuestionType={questionItemComponents}
      groupItemComponent={GroupItem}
      FormWrapper={FormWrapper}
    />
  );
};
