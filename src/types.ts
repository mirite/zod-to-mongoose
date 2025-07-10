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
type SupportedPrimitive = ZodString | ZodNumber | ZodBoolean | ZodDate;
export type SupportedType =
	| SupportedPrimitive
	| ZodDefault<ZodTypeAny>
	| ZodObject<ZodRawShape>
	| ZodUnion<readonly [ZodTypeAny, ...ZodTypeAny[]]>;
