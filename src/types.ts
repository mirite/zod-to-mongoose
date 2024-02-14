export type Field = {
    _def: FieldDefinition;
    checks?: Array<Check>;
    defaultValue?: () => unknown;
};

export type FieldDefinition = {
    typeName: string;
    innerType?: Field;
    description: string | undefined;
};

export type Check = "";
