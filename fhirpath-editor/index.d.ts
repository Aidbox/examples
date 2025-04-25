import { JSX as JSX_2 } from 'react/jsx-runtime';
import { Model } from 'fhirpath';

export declare function Editor({ defaultValue, onChange, data, variables, schema, model, debug, }: IEditorProps): JSX_2.Element;

declare type FhirElement = {
    array?: boolean;
    scalar?: boolean;
    min?: number;
    max?: number;
    choiceOf?: string;
    choices?: string[];
    excluded?: string[];
    required?: string[];
    elementReference?: string[];
    type?: string;
    elements?: FhirElements;
};

declare type FhirElements = Record<string, FhirElement>;

export declare type FhirSchema = {
    id: string;
    url: string;
    type: string;
    derivation: "specialization" | "constraint";
    kind: "complex-type" | "logical" | "primitive-type" | "resource";
    base?: string;
    excluded?: string[];
    required?: string[];
    elements?: FhirElements;
};

declare interface IEditorProps {
    defaultValue: string;
    onChange?: (value: string) => void;
    data: any;
    variables?: Record<string, any>;
    schema: FhirSchema[];
    model: Model;
    debug?: boolean;
}

export { }
