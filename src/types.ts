import type {
	ZodBoolean,
	ZodDate,
	ZodDefault,
	ZodNumber,
	ZodObject,
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
	| ZodDefault<ZodTypeAny>
	| ZodObject<ZodRawShape>
	| ZodUnion<readonly [ZodTypeAny, ...ZodTypeAny[]]>;
type SupportedPrimitive = ZodBoolean | ZodDate | ZodNumber | ZodString;
