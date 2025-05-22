import { JSX as JSX_2 } from 'react/jsx-runtime';
import { Model } from 'fhirpath';

declare type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export declare function Editor({ value, defaultValue, onChange, data, variables, schema, model, debug, portalRoot, style, text, }: IEditorProps): JSX_2.Element;

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
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    data: any;
    variables?: Record<string, any>;
    schema: FhirSchema[];
    model: Model;
    debug?: boolean;
    portalRoot?: string;
    style?: DeepPartial<Style>;
    text?: DeepPartial<Text_2>;
}

declare type Style = typeof style;

export declare const style: {
    binding: {
        menu: {
            button: string;
            icon: string;
        };
        cursor: {
            wrapper: string;
            faded: string;
            button: string;
            placeholder: string;
            search: string;
            incompatible: string;
            shortcut: string;
            icon: string;
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
            equals: string;
            empty: string;
            arrow: string;
            error: string;
            popover: string;
            failure: string;
        };
        animate: string;
        shakeX: string;
        debug: string;
        vbox: string;
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
        toggle: string;
        empty: string;
        search: string;
        container: string;
        backdrop: string;
        option: string;
        arrow: string;
    };
    tooltip: {
        container: string;
    };
    program: {
        container: string;
        extended: string;
        title: string;
        define: string;
        binding: string;
        main: string;
        empty: string;
        lightweight: string;
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
            label: string;
            name: string;
            args: string;
            arg: string;
            arrow: string;
            body: string;
            dropdown: string;
            button: string;
        };
        index: {
            wrapper: string;
        };
        null: {
            button: string;
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
        button: string;
        delete: string;
        deleting: string;
        error: string;
    };
};

export declare const text: {
    binding: {
        name: {
            placeholder: string;
        };
        menu: {
            delete: string;
            duplicate: string;
            asVariable: string;
        };
    };
    dropdown: {
        group: {
            showMore: string;
            showLess: string;
        };
        search: {
            placeholder: string;
        };
        empty: {
            nothingFound: string;
        };
    };
    program: {
        define: string;
        placeholder: {
            mainExpression: string;
            argumentExpression: string;
        };
        title: {
            variables: string;
            mainExpression: string;
        };
    };
    cursor: {
        groups: {
            variable: string;
            operator: string;
            function: string;
            field: string;
            index: string;
            answer: string;
            literal: string;
        };
    };
    token: {
        answer: {
            newExpression: string;
        };
        function: {
            search: {
                placeholder: string;
            };
            label: {
                arguments: string;
            };
        };
        type: {
            groups: {
                literalTypes: string;
                fhirPrimitiveTypes: string;
                fhirComplexTypes: string;
                fhirResourceTypes: string;
            };
        };
        labels: {
            number: string;
            string: string;
            boolean: string;
            date: string;
            datetime: string;
            time: string;
            quantity: string;
            type: string;
            index: string;
            null: string;
        };
    };
    value: {
        error: {
            message: string;
            empty: string;
            bindingError: string;
        };
    };
};

declare type Text_2 = typeof text;

export { }
