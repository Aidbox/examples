import { JSX as JSX_2 } from 'react/jsx-runtime';
import { Model } from 'fhirpath';

declare type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export declare function Editor({ defaultValue, onChange, data, variables, schema, model, debug, portalRoot, style, }: IEditorProps): JSX_2.Element;

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
    defaultValue?: string;
    onChange?: (value: string) => void;
    data: any;
    variables?: Record<string, any>;
    schema: FhirSchema[];
    model: Model;
    debug?: boolean;
    portalRoot?: string;
    style?: DeepPartial<Style>;
}

declare type Style = typeof style;

export declare const style: {
    binding: {
        menu: {
            button: string;
        };
        cursor: {
            wrapper: string;
            faded: string;
            button: string;
            search: string;
            incompatible: string;
            shortcut: string;
            dropdown: string;
        };
        value: {
            json: {
                container: string;
                punctuation: string;
                label: string;
                stringValue: string;
                collapsedContent: string;
            };
            button: string;
            arrow: string;
            error: string;
            popover: string;
        };
        animate: string;
        shakeX: string;
        debug: string;
        vbox: string;
        hbox: string;
        expression: string;
        nameless: string;
        equals: string;
        name: string;
        deleting: string;
    };
    dropdown: {
        icon: string;
        secondary: string;
        primary: string;
        group: string;
        empty: string;
        search: string;
        container: string;
        backdrop: string;
        option: string;
    };
    program: {
        container: string;
        extended: string;
        title: string;
        binding: string;
        define: string;
    };
    token: {
        answer: {
            icon: string;
            button: string;
        };
        boolean: {
            checkbox: string;
        };
        dateTime: {
            input: string;
        };
        date: {
            input: string;
        };
        function: {
            argument: {
                program: string;
            };
            header: string;
            search: string;
            args: string;
            arg: string;
            arrow: string;
            label: string;
            name: string;
            body: string;
            dropdown: string;
        };
        index: {
            wrapper: string;
        };
        number: {
            input: string;
        };
        operator: {
            icon: {
                wrapper: string;
                letter: string;
            };
            button: string;
        };
        quantity: {
            button: string;
            wrapper: string;
        };
        string: {
            wrapper: string;
        };
        time: {
            input: string;
        };
        container: string;
        deleting: string;
        button: string;
    };
};

export { }
