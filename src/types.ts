import type {
	util,
	ZodArray,
	ZodBoolean,
	ZodDate,
	ZodDefault,
	ZodEnum,
	ZodNullable,
	ZodNumber,
	ZodObject,
	ZodOptional,
	ZodRawShape,
	ZodString,
	ZodType,
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
	| ZodArray<ZodType>
	| ZodDefault<ZodType>
	| ZodEnum<Readonly<Record<string, util.EnumValue>>>
	| ZodNullable<ZodType>
	| ZodObject<ZodRawShape>
	| ZodOptional<ZodType>
	| ZodUnion<readonly [ZodType, ...ZodType[]]>;
type SupportedPrimitive = ZodBoolean | ZodDate | ZodNumber | ZodString;
