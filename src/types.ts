import type {
	ZodArray,
	ZodBoolean,
	ZodDate,
	ZodDefault,
	ZodEnum,
	ZodNumber,
	ZodObject,
	ZodOptional,
	ZodRawShape,
	ZodString,
	ZodTypeAny,
	ZodUnion,
} from "zod";

export type Check = "";

export type Field = {
	_def: FieldDefinition;
	checks?: Array<Check>;
	defaultValue?: () => unknown;
};

export type FieldDefinition = {
	description: string | undefined;
	innerType?: Field;
	typeName: string;
};
export type SupportedType =
	| SupportedPrimitive
	| ZodArray<ZodTypeAny>
	| ZodDefault<ZodTypeAny>
	| ZodEnum<[string, ...string[]]>
	| ZodObject<ZodRawShape>
	| ZodOptional<ZodTypeAny>
	| ZodUnion<readonly [ZodTypeAny, ...ZodTypeAny[]]>;
type SupportedPrimitive = ZodBoolean | ZodDate | ZodNumber | ZodString;
